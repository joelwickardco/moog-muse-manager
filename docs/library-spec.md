# Moog MUSE Library Directory Structure Specification

This document specifies the standard directory structure for Moog MUSE library files, which is used by the Moog MUSE Manager application.

## Root Directory

The root directory contains a single required subdirectory:

```
<library-root>/
└── library/           # Required directory containing all library data
```

## Library Directory

The `library` directory contains exactly 16 bank directories and a sequences directory:

```
library/
├── bank01/           # Bank directory 1
├── bank02/          # Bank directory 2
├── ...
├── bank16/          # Bank directory 16
└── sequences/        # Directory containing sequence files
```

* There are always exactly 16 bank directories (bank01 through bank16)
* Each bank directory must be present, even if empty
* The sequences directory is optional and can contain any number of sequence files

### Bank Directories

Each bank directory follows this structure:

```
bankXX/              # Where XX is 01 through 16
├── <bank-name>.bank # Bank metadata file (required)
└── patchYY/        # Where YY is 01 through 16 (optional)
    └── <patch-name>.mmp  # Moog MUSE patch file
```

#### Bank Metadata

* Each bank directory must contain exactly one `.bank` file
* The bank name is derived from the `.bank` filename (e.g., "muse.bank" indicates the bank is named "muse")
* The contents of the `.bank` file are unused by the application
* Bank directories are numbered from `bank01` to `bank16`

#### Patch Structure

* Each bank can contain up to 16 patch directories (patch01 through patch16)
* Each patch directory can contain exactly one `.mmp` file
* If a patch directory does not contain an `.mmp` file, the synthesizer will treat this patch as a default Initial Patch
* Patch directories are numbered from `patch01` to `patch16`
* Patch files are named descriptively (e.g., "vox humana.mmp")

### Sequences Directory

The sequences directory is organized under each library in the following hierarchy:

```
library/sequences/
├── bank01/           # Sequence bank corresponding to patch bank01
│   ├── seq01/        # Sequence directory for patch01 in bank01
│   │   └── <sequence-name>.mmseq
│   ├── seq02/
│   └── ...
├── bank02/
│   ├── seq01/
│   └── ...
...
└── bank16/
    ├── seq01/
    ├── seq02/
    └── ...
```

* Sequence files are named descriptively and use the `.mmseq` extension
* Sequence files are required to exist for every patch directory
* If a custom sequence file has not been specified, the sequence directory will contain a default file named `new sequence.mmseq`

## File Types

* `.mmp`: Moog MUSE patch files
* `.mmseq`: Moog MUSE sequence files
* `.bank`: Bank metadata files

## Sequence File Format

Sequence files (`.mmseq`) are plain text files that contain sequence settings and parameters. Each sequence file defines exactly 64 steps, with each step representing a note played during that step of the sequence. The file format is structured as follows:

```
Version = 2;
Settings : 
{
    Length = <number>;      // Number of active steps (1-64)
    Direction = <number>;   // Sequence playback direction (0 = forward)
    Swing = <number>;       // Timing swing value
    Scale = <number>;       // Scale type (0 = chromatic)
    ScaleRoot = <number>;   // Root note of the scale (60 = C4)
    PatchLockPatch = <number>;
    PatchLockBank = <number>;
    ClockDiv = <number>;    // Clock division value
    BPM = <number>;         // Beats per minute setting
    ParamRecordLane1 = <number>;
    ParamRecordLane2 = <number>;
    ParamRecordLane3 = <number>;
    ParamRecordLane4 = <number>;
    ParamRecordLane5 = <number>;
    Step1 = <note_data>;
    Step2 = <note_data>;
    ...
    Step64 = <note_data>;
}
```

### Sequence Parameters

* `Version`: File format version number (currently 2)
* `Length`: Number of active steps in the sequence (1-64)
* `Direction`: Sequence playback direction (0 = forward)
* `Swing`: Timing swing value
* `Scale`: Scale type (0 = chromatic)
* `ScaleRoot`: Root note of the scale (60 = C4)
* `PatchLockPatch`: Patch lock setting
* `PatchLockBank`: Bank lock setting
* `ClockDiv`: Clock division value
* `BPM`: Beats per minute setting
* `ParamRecordLaneN`: Parameter recording lanes (TODO: Determine meaning of values)
* `ClockDivType`: Clock division type
* `PostTimeQtzMode`: Post-time quantization mode
* `NoteProbUnipolar`: Boolean flag for note probability mode

### Note Properties

Each note in a sequence step has the following properties:

* `Timbre`: Integer value (1 for active notes, 0 for inactive)
* `Pitch`: MIDI note value
* `Active`: Boolean indicating if the note is active
* `GateLength`: Duration of note (0.5 to 2.0)
* `Velocity`: MIDI velocity value (0-127)
* `TimeOffset`: Time offset value
* `IsTie`: Boolean indicating if note is tied to previous note

### Step Properties

Each sequence step has additional properties:

* `NoteProbability`: Probability of note occurring (0.0 to 1.0)
* `NoteProbRange`: Range for note probability variation
* `GateLengthProbability`: Probability of gate length variation
* `GateLengthProbRange`: Range for gate length probability variation
* `VelocityProbability`: Probability of velocity variation
* `VelocityProbRange`: Range for velocity probability variation
* `GateProbability`: Probability of gate occurring (0.0 to 1.0)
* `ParamRecord1-8`: Parameter recording values for each lane (-1 indicates no recording)

### Notes

* Each sequence file defines exactly 64 steps, numbered 1 through 64
* The `Length` parameter specifies how many of these steps are active (1-64)
* Each step contains note data that defines what note is played during that step
* All values are floating point numbers or integers
* The file uses semicolons to terminate statements
* The settings are enclosed in curly braces after the "Settings:" keyword
* The file format is plain text and uses ASCII encoding
* Sequence files are associated with specific patches through their directory structure

## Naming Conventions

* Bank directories: `bankXX` where XX is a two-digit number (01-16)
* Sequence bank directories: `seqXX` where XX is a two-digit number (01-16)
* Patch directories: `patchYY` where YY is a two-digit number (01-16)
* Sequence patch directories: `seqYY` where YY is a two-digit number (01-16)
* Patch files: Descriptive names followed by `.mmp` extension
* Sequence files: Descriptive names followed by `.mmseq` extension

## Notes

1. The structure is hierarchical and must be maintained exactly as specified
2. All directories and files are case-sensitive
3. The number of banks (16) and patches per bank (16) is fixed
4. Sequence files are not limited to any specific number

## Database Integration and Purpose

The Moog MUSE Library Directory Structure is designed to serve as a portable file-based representation of the data stored in the Moog MUSE Manager application database. This structure allows complete round-trip support for import and export operations between the filesystem and the application's relational database schema.

The database schema consists of the following key tables:

* `libraries`: Represents each root library.
* `banks`: Represents each patch or sequence bank; linked to a library and typed as either `'patch'` or `'sequence'`.
* `patches`: Represents `.mmp` patch files, storing raw content and metadata (name, tags, favorited status).
* `patch_sequences`: Represents `.mmseq` sequence files with content and display name.

Each component in the directory structure corresponds directly to a record in one or more database tables, enabling precise synchronization of patch and sequence data.

## Import Processing Rules

The following rules define how the Moog MUSE Manager application imports a filesystem-based library into its database:

* **Library Name**: Derived from the selected root directory name.

* **Library Fingerprint**: Calculated as the SHA-256 hash of all file contents under the root, recursively.

* **Banks**:

  * `name`: Derived from the `.bank` filename (minus `.bank`).
  * `system_name`: Set to the folder name (`bankXX` or `seqXX`).
  * `.bank` file content is stored in the `banks.content` column.

* **Patches**:

  * Located in `bankXX/patchYY/`.
  * Each patch has a single `.mmp` file. If missing, an entry is created with `content = NULL` and `default_patch = TRUE`.
  * `name`: Derived from the `.mmp` filename (minus extension).
  * `favorited` defaults to `FALSE`; `tags` defaults to an empty JSON array.

* **Sequences**:

  * Located in `library/sequences/bankXX/seqYY/`.
  * Each directory must contain at least one `.mmseq` file.
  * If no custom file is found, the default file `new sequence.mmseq` is used and imported.
  * `name`: Derived from the filename (minus extension).

* **Matching**:

  * Banks and patches/sequences are matched by folder nesting.
  * Each patch or sequence is assigned to the bank in which it was found.

* **Validation**:

  * The importer enforces strict conformance to this spec.
  * Any deviation (e.g., wrong folder names, missing `.bank` file, extra banks) will cause the import to fail with a descriptive error.

## Export Processing Rules

The following rules define how the Moog MUSE Manager application exports a database-based library into the standard file structure:

* **Library Root**:

  * User selects a target root directory
  * The application creates a folder named after the library (from `libraries.name`) within that root

* **Banks and Patches**:

  * The application exports exactly 16 `bankXX/` directories, ordered by `bank_number`
  * Each bank folder contains a `.bank` file using the value of `banks.name` plus `.bank`
  * Each bank folder contains 16 `patchYY/` directories, ordered by `patch_number`
  * If `patches.default_patch = TRUE` or `content IS NULL`, the `patchYY/` folder is left empty
  * Otherwise, one `.mmp` file is written to each `patchYY/`, named using `patches.name` plus `.mmp`

* **Sequences**:

  * The `library/sequences/` folder is created
  * For each patch bank, a corresponding `bankXX/` folder is created under `sequences/`, ordered by `bank_number`
  * Each sequence bank folder contains 16 `seqYY/` subdirectories ordered by `sequence_number`
  * Each sequence folder contains exactly one `.mmseq` file
  * The sequence file is named using `patch_sequences.name` plus `.mmseq` and populated from `patch_sequences.content`

* **Naming and Paths**:

  * File and folder names are case-sensitive and must match naming conventions exactly (e.g., `patch01`, `seq02`)
  * Naming of folders will follow the format `bankYY`, `patchYY`, or `seqYY` where `YY` is the zero-padded value of `bank_number`, `patch_number`, or `sequence_number`, respectively

* **Validation**:

  * If a required record (bank, patch, or sequence) is missing from the database, the export process will fail with a descriptive error

The full database schema used by the Moog MUSE Manager application is defined as follows:

```
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
  content BLOB,           -- Raw binary content of .bank file
  fingerprint TEXT UNIQUE,
  FOREIGN KEY(library_id) REFERENCES libraries(id)
);

CREATE TABLE patches (
  id INTEGER PRIMARY KEY,
  patch_number INTEGER,
  bank_id INTEGER,
  fingerprint TEXT UNIQUE,   -- SHA-256 hash of file contents
  content TEXT,              -- Raw .mmp file contents
  name TEXT,
  default_patch BOOLEAN DEFAULT FALSE,
  favorited BOOLEAN DEFAULT FALSE,
  tags TEXT,                 -- JSON-encoded array of strings
  FOREIGN KEY(bank_id) REFERENCES banks(id)
);

CREATE TABLE patch_sequences (
  id INTEGER PRIMARY KEY,
  sequence_number INTEGER,
  bank_id INTEGER,
  name TEXT,
  fingerprint TEXT UNIQUE,   -- SHA-256 hash of file contents
  content TEXT,               -- Raw .mmseq file contents
  FOREIGN KEY(bank_id) REFERENCES banks(id)
);
```

 in the directory structure corresponds directly to a record in one or more database tables, enabling precise synchronization of patch and sequence data.
