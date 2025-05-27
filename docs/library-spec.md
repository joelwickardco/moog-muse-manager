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

- There are always exactly 16 bank directories (bank01 through bank16)
- Each bank directory must be present, even if empty
- The sequences directory is optional and can contain any number of sequence files

### Bank Directories

Each bank directory follows this structure:

```
bankXX/              # Where XX is 01 through 16
├── <bank-name>.bank # Bank metadata file (required)
└── patchYY/        # Where YY is 01 through 16 (optional)
    └── <patch-name>.mmp  # Moog MUSE patch file
```

#### Bank Metadata
- Each bank directory must contain exactly one `.bank` file
- The bank name is derived from the `.bank` filename (e.g., "muse.bank" indicates the bank is named "muse")
- The contents of the `.bank` file are unused by the application
- Bank directories are numbered from `bank01` to `bank16`

#### Patch Structure
- Each bank can contain up to 16 patch directories (patch01 through patch16)
- Each patch directory contains exactly one `.mmp` file
- Patch directories are numbered from `patch01` to `patch16`
- Patch files are named descriptively (e.g., "vox humana.mmp")

### Sequences Directory

The `sequences` directory is organized hierarchically to match the bank and patch structure:

```
sequences/
├── seq01/           # Corresponds to bank01
│   ├── seq01/      # Corresponds to bank01/patch01
│   ├── seq02/      # Corresponds to bank01/patch02
│   └── ...
├── seq02/           # Corresponds to bank02
│   ├── seq01/      # Corresponds to bank02/patch01
│   ├── seq02/      # Corresponds to bank02/patch02
│   └── ...
├── ...
└── seq16/           # Corresponds to bank16
    ├── seq01/      # Corresponds to bank16/patch01
    ├── seq02/      # Corresponds to bank16/patch02
    └── ...
```

- Contains sequence files in `.mmseq` format
- Sequence files are named descriptively
- There are 16 sequence bank directories (seq01 through seq16)
- Each sequence bank directory contains up to 16 sequence patch directories (seq01 through seq16)
- Sequence directories are organized to mirror the bank/patch structure:
  - `sequences/seqXX/seqYY` corresponds to `bankXX/patchYY`
  - Each sequence directory contains sequence files that are associated with the corresponding patch
- Sequence files are not required to exist for every patch directory
- Sequence files are named descriptively and use the `.mmseq` extension

## File Types

- `.mmp`: Moog MUSE patch files
- `.mmseq`: Moog MUSE sequence files
- `.bank`: Bank metadata files

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

- `Version`: File format version number (currently 2)
- `Length`: Number of active steps in the sequence (1-64)
- `Direction`: Sequence playback direction (0 = forward)
- `Swing`: Timing swing value
- `Scale`: Scale type (0 = chromatic)
- `ScaleRoot`: Root note of the scale (60 = C4)
- `PatchLockPatch`: Patch lock setting
- `PatchLockBank`: Bank lock setting
- `ClockDiv`: Clock division value
- `BPM`: Beats per minute setting
- `ParamRecordLaneN`: Parameter recording lanes (TODO: Determine meaning of values)
- `ClockDivType`: Clock division type
- `PostTimeQtzMode`: Post-time quantization mode
- `NoteProbUnipolar`: Boolean flag for note probability mode

### Note Properties

Each note in a sequence step has the following properties:

- `Timbre`: Integer value (1 for active notes, 0 for inactive)
- `Pitch`: MIDI note value
- `Active`: Boolean indicating if the note is active
- `GateLength`: Duration of note (0.5 to 2.0)
- `Velocity`: MIDI velocity value (0-127)
- `TimeOffset`: Time offset value
- `IsTie`: Boolean indicating if note is tied to previous note

### Step Properties

Each sequence step has additional properties:

- `NoteProbability`: Probability of note occurring (0.0 to 1.0)
- `NoteProbRange`: Range for note probability variation
- `GateLengthProbability`: Probability of gate length variation
- `GateLengthProbRange`: Range for gate length probability variation
- `VelocityProbability`: Probability of velocity variation
- `VelocityProbRange`: Range for velocity probability variation
- `GateProbability`: Probability of gate occurring (0.0 to 1.0)
- `ParamRecord1-8`: Parameter recording values for each lane (-1 indicates no recording)

### Notes
- Each sequence file defines exactly 64 steps, numbered 1 through 64
- The `Length` parameter specifies how many of these steps are active (1-64)
- Each step contains note data that defines what note is played during that step
- All values are floating point numbers or integers
- The file uses semicolons to terminate statements
- The settings are enclosed in curly braces after the "Settings:" keyword
- The file format is plain text and uses ASCII encoding
- Sequence files are associated with specific patches through their directory structure

## Naming Conventions

- Bank directories: `bankXX` where XX is a two-digit number (01-16)
- Sequence bank directories: `seqXX` where XX is a two-digit number (01-16)
- Patch directories: `patchYY` where YY is a two-digit number (01-16)
- Sequence patch directories: `seqYY` where YY is a two-digit number (01-16)
- Patch files: Descriptive names followed by `.mmp` extension
- Sequence files: Descriptive names followed by `.mmseq` extension

## Notes

1. The structure is hierarchical and must be maintained exactly as specified
2. All directories and files are case-sensitive
3. The number of banks (16) and patches per bank (16) is fixed
4. Sequence files are not limited to any specific number

