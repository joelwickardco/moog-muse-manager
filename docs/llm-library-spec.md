# Moog MUSE Library Specification

This specification defines the directory and database structure used by the Moog MUSE Manager application for managing synthesizer libraries. It ensures consistent import/export between a filesystem layout and a normalized database model.

---

## 📂 Directory Overview

```
<library-root>/
└── library/
    ├── bank01/ - bank16/
    │   └── patch01/ - patch16/
    │       └── <patch>.mmp
    └── sequences/
        ├── bank01/ - bank16/
        │   └── seq01/ - seq16/
        │       └── <sequence>.mmseq
```

---

## 📘 Key Terms (Glossary)

| Term          | Definition                                                                   |
| ------------- | ---------------------------------------------------------------------------- |
| Library       | A complete filesystem tree containing all banks, patches, and sequences      |
| Bank          | A folder representing a collection of patches or sequences (bank01 - bank16) |
| Patch         | A sound configuration stored in `.mmp` format                                |
| Sequence      | A step-sequenced pattern stored in `.mmseq` format                           |
| Default Patch | A patch folder without a `.mmp` file, interpreted as the initial preset      |

---

## 📄 File and Folder Naming Rules

| Type             | Format         | Notes                                      |
| ---------------- | -------------- | ------------------------------------------ |
| Bank Folders     | `bankYY`       | YY = `bank_number` zero-padded (01–16)     |
| Patch Folders    | `patchYY`      | YY = `patch_number` zero-padded (01–16)    |
| Sequence Folders | `seqYY`        | YY = `sequence_number` zero-padded (01–16) |
| Patch File       | `<name>.mmp`   | Filename = `patches.name`                  |
| Sequence File    | `<name>.mmseq` | Filename = `patch_sequences.name`          |

---

## 🔁 Filesystem to Database Mapping

| Filesystem Path                                   | Table            | Notes                                          |
| ------------------------------------------------- | ---------------- | ---------------------------------------------- |
| library/bank03/pads.bank                          | banks            | `bank_number = 3`, `name = 'pads'`             |
| library/bank03/patch05/vox humana.mmp             | patches          | `patch_number = 5`, `name = 'vox humana'`      |
| library/sequences/bank03/seq05/new sequence.mmseq | patch\_sequences | `sequence_number = 5`, `name = 'new sequence'` |

---

## ✅ Import Processing Rules

* `library.name` = directory name selected by user
* `library.fingerprint` = SHA-256 hash of all file contents recursively

### Banks

* 16 required `bankXX` directories
* `.bank` file required in each, named from `banks.name`
* Folder name becomes `banks.system_name`
* Content of `.bank` file is stored as binary in `banks.content`

### Patches

* Up to 16 `patchYY` directories per bank
* Each may contain 1 `.mmp` file → `patches.name`
* If no `.mmp` file: mark `default_patch = TRUE`, `content = NULL`
* `favorited = FALSE`, `tags = []` (default)

### Sequences

* Stored under `library/sequences/bankXX/seqYY/`
* Each must contain 1 `.mmseq` file → `patch_sequences.name`
* If missing, use default: `new sequence.mmseq`

### Validation

* Import fails with descriptive error if directory does not strictly conform

---

## 📤 Export Processing Rules

* Target export directory is selected by the user
* Application creates a folder with the name of the selected library

### Banks and Patches

* Exactly 16 `bankYY` folders exported, sorted by `bank_number`
* Each bank contains:

  * One `.bank` file: name = `banks.name`
  * 16 `patchYY/` subfolders from `patch_number`
  * `.mmp` file written only if `default_patch = FALSE` and `content IS NOT NULL`

### Sequences

* Structure: `library/sequences/bankYY/seqYY/`
* All 16 `bankYY` and 16 `seqYY` subfolders exported
* Each `seqYY/` must contain one `.mmseq` file from `patch_sequences.name`

### Naming

* Folder names follow `bankYY`, `patchYY`, `seqYY` where `YY = zero-padded number`
* File names are derived from the `name` field in the database

### Validation

* Export fails if required data (bank, patch, sequence) is missing

---

## 🧩 Database Schema

```sql
CREATE TABLE libraries (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE,
  fingerprint TEXT UNIQUE
);

CREATE TABLE banks (
  id INTEGER PRIMARY KEY,
  bank_number INTEGER,
  library_id INTEGER,
  name TEXT,
  system_name TEXT,
  type TEXT CHECK(type IN ('patch', 'sequence')),
  content BLOB,
  fingerprint TEXT UNIQUE,
  FOREIGN KEY(library_id) REFERENCES libraries(id)
);

CREATE TABLE patches (
  id INTEGER PRIMARY KEY,
  patch_number INTEGER,
  bank_id INTEGER,
  fingerprint TEXT UNIQUE,
  content TEXT,
  name TEXT,
  default_patch BOOLEAN DEFAULT FALSE,
  favorited BOOLEAN DEFAULT FALSE,
  tags TEXT,
  FOREIGN KEY(bank_id) REFERENCES banks(id)
);

CREATE TABLE patch_sequences (
  id INTEGER PRIMARY KEY,
  sequence_number INTEGER,
  bank_id INTEGER,
  name TEXT,
  fingerprint TEXT UNIQUE,
  content TEXT,
  FOREIGN KEY(bank_id) REFERENCES banks(id)
);
```

---

## 📝 File Format: .mmseq

Each `.mmseq` file defines a musical step sequence. The file is a plain-text format consisting of two main blocks: `Settings` and `Steps`, enclosed in braces and terminated with semicolons.

### Top-Level Structure

```
Version = 2;
Settings : { ... };
Steps : { ... };
```

---

### 🔧 Settings Block

Defines global sequence parameters.

| Field              | Type    | Description                            |
| ------------------ | ------- | -------------------------------------- |
| Length             | Integer | Number of active steps (1–64)          |
| Direction          | Integer | Playback direction (0 = forward, etc.) |
| Swing              | Float   | Swing intensity (timing offset)        |
| Scale              | Integer | Scale type (0 = chromatic)             |
| ScaleRoot          | Integer | MIDI root note (e.g., 60 = C4)         |
| PatchLockPatch     | Integer | Patch override (-1 = none)             |
| PatchLockBank      | Integer | Bank override (-1 = none)              |
| ClockDiv           | Float   | Clock division ratio                   |
| BPM                | Float   | Tempo in beats per minute              |
| ParamRecordLane1–8 | Integer | Parameter automation (-1 = unused)     |
| ClockDivType       | Integer | Clock mode (reserved)                  |
| PostTimeQtzMode    | Integer | Post-quantization setting              |
| NoteProbUnipolar   | Boolean | Enables unipolar probability model     |

---

### 🎼 Steps Block

Contains 64 steps, each defining up to 8 notes and variations.

```
Steps : {
  Step1 : {
    <step-fields>
    Note1 : { <note-fields> };
    CoinToss1 : { <note-fields> };
    ...
    Note8 : { ... }
    CoinToss8 : { ... }
  }
  ...
  Step64 : { ... }
}
```

#### Step-Level Fields

| Field                 | Type    | Description                       |
| --------------------- | ------- | --------------------------------- |
| NoteProbability       | Float   | Chance note is played (0.0–1.0)   |
| NoteProbRange         | Integer | Random pitch deviation            |
| GateLengthProbability | Float   | Chance gate length varies         |
| GateLengthProbRange   | Integer | Gate length variation range       |
| VelocityProbability   | Float   | Chance velocity varies            |
| VelocityProbRange     | Integer | Velocity variation range          |
| GateProbability       | Float   | Probability of gate trigger       |
| ParamRecord1–8        | Integer | Per-step param data (-1 = unused) |

#### Note/CoinToss Fields

Each `NoteX` and `CoinTossX` object includes:

| Field      | Type    | Description                           |
| ---------- | ------- | ------------------------------------- |
| Timbre     | Integer | Timbre index (0 = default)            |
| Pitch      | Integer | MIDI pitch value                      |
| Active     | Boolean | Whether note is active                |
| GateLength | Float   | Duration of note (e.g. 0.5–2.0 beats) |
| Velocity   | Integer | MIDI velocity (0–127)                 |
| TimeOffset | Integer | Timing offset in ticks                |
| IsTie      | Boolean | Note continues from previous step     |

---

### 🔍 Notes

* All values are semicolon-terminated
* File is plain-text and ASCII-encoded
* Steps without active notes may still include CoinToss or probability logic
* Only `Length` number of steps (1–64) are considered active during playback
* Note/CoinToss pairs allow for expressive probabilistic alternation

This specification enables deterministic and probabilistic playback modeling for hardware or software sequencers.

---

This format is optimized for ingestion by tooling, LLMs, and validation engines.
