## Introduction & Goals
This document defines the functional and architectural specifications for a desktop application—built on **Electron**—to manage sound patches and step-sequencer files for the Moog Muse synthesizer. The app's primary objectives are:
- **Patch Library Management**: Import, organize, favorited, tag, and export `.mmp` patch files in a USB-transferable directory layout.
- **Step-Sequencer Editor**: Visually display and edit 64-step MIDI sequences (`.mmseq`), including step toggling, note/velocity assignment (via mouse or MIDI controller), and import/export.

## User Personas & Use Cases
1. **Synth Enthusiast**
   - Wants to browse hundreds of patches, "♥" favorited ones, tag them (e.g. "ambient"), and create new libraries of patches / sequences to export as library .zip files for transfer to Muse via USB.
2. **Live Performer**
   - Quickly builds or tweaks sequences on the fly, using a MIDI controller to set notes/velocities, then exports sequences via the app.
3. **Sound Designer**
   - Applies free-form tags, and favorited patches and sequences, and shares organized libraries with collaborators.

## Functional Requirements

### 1. Patch Management

#### Import
- Import patches according to the structure defined in [library_spec.md](cci:7://file:///Users/joelwickard/develop/moog-muse-manager/library-spec.md:0:0-0:0)
- Support for .mmp patch files and .mmseq patch sequence files
- Import Process:
  1. User selects a .zip file containing the library structure defined in [library_spec.md](cci:7://file:///Users/joelwickard/develop/moog-muse-manager/library-spec.md:0:0-0:0)
  2. System unzips the file into a temporary directory
  3. System validates directory structure against [library_spec.md](cci:7://file:///Users/joelwickard/develop/moog-muse-manager/library-spec.md:0:0-0:0)
  4. System begins parsing the directory structure, creating SQLite entries for each library, bank, patch, and sequence with the following steps:
    1. System reads the root directory name as the library name
    2. System calculates a SHA-256 hash of the library root directory and all file contents
    3. System checks to see if the library already exists in the database with the same name and hash
    4. If a library with the same name and hash exists, System prompts notifies user that the library will be skipped.
    5. If the library doesn't exist, System creates a new library entry in the database with the name and hash as the fingerprint.
    6. System creates a new bank entry for each bank directory in the library.
      1. System reads the .bank file and uses the file name as the bank name.
      2. System calculates a SHA-256 hash of the .bank file contents
      2. System creates the bank record with the name and library_id and the .bank file contents as the content, and the hash as the fingerprint and the directory name as the system_name.
    7. System creates a new patch entry for each patch directory in the bank.
      1. System reads the .mmp file and uses the file name as the patch name.
      2. System calculates a SHA-256 hash of the .mmp file contents
      2. System creates the patch record with the name and bank_id and the .mmp file contents as the content, and the hash as the fingerprint.
    8. System reads the patch sequences directory in the library root directory.
      1. System reads each band subdirectory and uses the directory name as the system_name.
      2. System finds the bank record with the matching system_name and uses the bank_id.
      2. System reads the .mmseq file and uses the file name as the sequence name.
      3. System calculates a SHA-256 hash of the .mmseq file contents
      2. System creates the patch sequence record with the name and bank_id and the .mmseq file contents as the content, and the hash as the fingerprint.
  - Display imported patches in a list with:
    - Patch name
    - Bank name
    - Library name
    - Tags
    - Favorited status

- **Organize & Search**
  - Present library view grouped by bank and category.
  - Filter by "Favorited" (♥), category, and free-form tags.
- **Metadata Editing**
  - Toggle "Favorited" (heart) on each patch.
  - Add/remove free-form tags.
- **Export**
  - During export:
    - Create directory structure according to library_spec.md
    - Write .mmp and .mmseq files using stored content from database
    - Maintain original file structure and naming conventions

### 2. Patch Sequencer Editor
- **Import/Export**
  - Load `.mmseq` files from `library/sequences/bankXX/seqYY/`.
  - Serialize back to the same custom text format.
- **Visual Grid**
  - 8×8 grid (64 steps), each cell shows "on/off" status; click to toggle.
  - Right-click (or MIDI input) to assign Note (0–127) and Velocity (0–127).
- **Global Settings Panel**
  - Expose at least:
    - Length (1–64 steps)
    - BPM (e.g. 20.0–300.0)
    - ClockDiv
    - Direction (Forward/Reverse/Pendulum)
- **MIDI Controller Integration**
  - Listen via Web MIDI API (or Node MIDI lib) for note/velocity mapping to selected step.
- **Live Preview**
  - Optional playback of current patch sequence at set BPM for auditioning.

## Non-Functional Requirements
- **Platforms**: Electron packaging for macOS (primary), Windows, Linux.
- **Performance**:
  - Instant library navigation even with ~1,000 patches/sequences.
  - Sub-100 ms response for UI interactions.
- **Data Integrity**:
  - Backup or transactional writes when saving metadata or exporting.
  - Rollback on parse/serialization errors.
- **Security**:
  - Sandboxed file access.
  - No telemetry or external network calls without explicit consent.

## Architectural Overview
```
┌────────────────┐      ┌───────────────────┐      ┌────────────────┐
│   Renderer     │◀────▶│   Main Process    │◀────▶│   SQLite DB    │
│ (React + Web   │      │  (Node.js + APIs) │      │                │
│  MIDI Bridge)  │      └───────────────────┘      └────────────────┘
└────────────────┘
         │
         ▼
   File I/O Module
(parse .mmseq; copy .mmp)
```

- **Renderer**
  - UI built with React (or Vue/Svelte), using Electron's `ipcRenderer` to communicate.
  - Web MIDI or Node MIDI integration for controller input.
- **Main Process**
  - Handles filesystem I/O, database access, CSV/text parsing/serialization.
  - Exposes IPC channels:
    - `importLibrary()`
    - `loadLibrary()`, `exportLibrary()`
    - `loadPatchSequence()`, `savePatchSequence()`

## Component Breakdown
1. **Patch Library Manager**
2. **Sequencer Grid Editor**
3. **Global Settings Panel**
4. **File Import/Export Module**
5. **Parser/Serializer** for `.mmseq`
6. **Persistence Layer** (SQLite wrappers)
7. **MIDI Controller Bridge**
8. **Export Engine** (directory dumper)

## Data Model & File Formats

### SQLite Schema
```sql
CREATE TABLE libraries (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE
  fingerprint TEXT UNIQUE
);

CREATE TABLE banks (
  id INTEGER PRIMARY KEY,
  library_id INTEGER,
  name TEXT,
  system_name TEXT,
  type TEXT CHECK(type IN ('patch', 'sequence')),
  fingerprint TEXT UNIQUE,
  FOREIGN KEY(library_id) REFERENCES libraries(id)
);

CREATE TABLE patches (
  id INTEGER PRIMARY KEY,
  fingerprint TEXT UNIQUE,   -- SHA-256 hash of file contents
  content TEXT,           -- Raw .mmp file contents
  name TEXT,
  favorited BOOLEAN DEFAULT FALSE,
  tags TEXT               -- JSON-encoded array of strings
);

CREATE TABLE patch_sequences (
  id INTEGER PRIMARY KEY,
  name TEXT,
  fingerprint TEXT UNIQUE,   -- SHA-256 hash of file contents
  content TEXT,           -- Raw .mmseq file contents
);

CREATE TABLE bank_patches (
  id INTEGER PRIMARY KEY,
  bank_id INTEGER,
  patch_id INTEGER,
  FOREIGN KEY(bank_id) REFERENCES banks(id),
  FOREIGN KEY(patch_id) REFERENCES patches(id),
  UNIQUE(bank_id, patch_id)
);

CREATE TABLE bank_patch_sequences (
  id INTEGER PRIMARY KEY,
  bank_id INTEGER,
  patch_sequence_id INTEGER,
  FOREIGN KEY(bank_id) REFERENCES banks(id),
  FOREIGN KEY(patch_sequence_id) REFERENCES patch_sequences(id),
  UNIQUE(bank_id, patch_sequence_id)
);
```

### File Format Details

#### `.mmseq` Format
- Top-level blocks: `Version`, `Settings`, `Steps`.
- Settings and Steps use `Key = Value;` syntax; Steps: `StepN = { Enabled = true; Note = 60; Velocity = 100; }`.
- Serialize must preserve ordering and comments (if any).
- Version 2 format with support for all sequence parameters.

#### `.mmp` Format
- Binary patch format specific to Moog MUSE.
- Content is stored as BLOB in database.
- Not modified by application, only stored and retrieved.
- Original file timestamps are preserved.

## UI/UX Flows & Wireframes
- **Library View**: Sidebar banks → patch grid/list → metadata editor panel.
- **Sequence View**: Grid + settings sidebar + playback controls + MIDI map mode.
- **Export Wizard**: Select target folder → preview directory tree → execute.

*(Wireframes to be sketched in Vibe and attached separately.)*

## Technology Stack & Tooling
- **Electron** (v25+)
- **UI**: React + TypeScript + Tailwind (or Styled Components)
- **State**: Redux or Zustand for metadata & sequence state
- **DB**: SQLite via `@vscode/sqlite3`
- **Parser**: Custom Node.js module for `.mmseq`
- **MIDI**: `webmidi` (renderer) or `@julusian/midi` (main)
- **Build**: electron-builder for macOS (.dmg), Windows (.exe/.msi), Linux (.AppImage/.deb)
- **Testing**:
  - Unit: Jest (parser, serialize, DB)
  - Integration: Spectron or Playwright for end-to-end UI

## Testing Strategy
1. **Unit Tests**
   - Parser/serializer round-trip for `.mmseq`.
   - DB CRUD operations.
2. **Integration Tests**
   - Library import → metadata edit → export.
   - Sequence editing via simulated MIDI input.
3. **Manual QA**
   - Cross-platform packaging and install flows.
   - Performance benchmarks on ~1,000 patches.

## Deployment & Distribution
- **CI/CD** via GitHub Actions:
  - Lint, test, package on each push.
  - Auto-publish nightly builds to a staging channel.
- **Releases**:
  - Manual approval for stable tags.
  - Signed installers for macOS (notarization), Windows (code signing).
