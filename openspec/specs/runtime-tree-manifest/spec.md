# runtime-tree-manifest Specification

## Purpose
TBD - created by archiving change govern-host-response-and-runtime-tree-io. Update Purpose after archive.
## Requirements
### Requirement: Runtime tree operations use one deterministic manifest

Each runtime tree business operation SHALL use one deterministic manifest as
the operation-scoped source for traversal metadata and downstream file work.

#### Scenario: A runtime tree is scanned

- **WHEN** a business operation needs files, metadata, checksum, or copy input
- **THEN** it SHALL produce one operation-scoped manifest ordered by relative path
- **AND** downstream consumers in that operation SHALL reuse its file, directory,
  size, modification-time, count, byte, and depth metadata.

### Requirement: Non-business directories are excluded centrally

Runtime tree policies SHALL centrally exclude exact directory segments that
cannot contain business files.

#### Scenario: Excluded directory names occur at any depth

- **WHEN** a tree contains `.git`, `node_modules`, `.venv`, or configured cache
  directories
- **THEN** the scanner SHALL prune the exact directory segment
- **AND** similarly named directories SHALL remain eligible.

### Requirement: Large trees are observed without truncation

Runtime tree budgets SHALL provide observability without silently truncating
eligible business files.

#### Scenario: A tree exceeds its observation budget

- **WHEN** depth, entry count, or total bytes exceed the named policy budget
- **THEN** the full eligible tree SHALL still be returned
- **AND** one structured warning and low-cardinality profiler evidence SHALL
  identify the exceeded dimensions.

### Requirement: Runtime tree copy avoids whole-file JavaScript buffers

Runtime tree replacement SHALL copy files without materializing complete file
contents in JavaScript memory.

#### Scenario: A manifest is copied

- **WHEN** a complete manifest is copied to a replacement target
- **THEN** files SHALL use native asynchronous copy through an independent
  single-worker scheduler
- **AND** the target SHALL be atomically replaced only after staging succeeds
- **AND** the R6 file-transfer worker SHALL remain independent.
