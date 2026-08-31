## ADDED Requirements

### Requirement: Run-result bundle readers SHALL open through one Bundle I/O seam

Workflow apply paths and SkillRunner bundle settlement SHALL open run-result
bundle readers through one Bundle I/O entry that chooses the temp zip,
directory, or unavailable branch and returns a handle with reader and dispose.

#### Scenario: Bundle bytes open a temp zip with dispose cleanup

- **WHEN** a run result carries non-empty `bundleBytes`
- **THEN** Bundle I/O SHALL write the bytes to a temp zip path and open a zip reader
- **AND** the returned handle SHALL expose the bundle path
- **AND** `dispose()` SHALL remove only that temp zip file
- **AND** repeated `dispose()` calls SHALL be safe no-ops

#### Scenario: Bundle directory opens without temp file

- **WHEN** a run result carries `bundleDir` and no non-empty `bundleBytes`
- **THEN** Bundle I/O SHALL open a directory reader for that directory
- **AND** the handle bundle path SHALL be empty
- **AND** `dispose()` SHALL NOT remove the directory

#### Scenario: Missing bundle source opens an unavailable reader

- **WHEN** a run result carries no non-empty `bundleBytes` and no `bundleDir`
- **THEN** Bundle I/O SHALL open an unavailable reader
- **AND** the handle bundle path SHALL be empty

#### Scenario: Callers hold handles through apply and dispose them

- **WHEN** an apply path or SkillRunner bundle settlement opens a run-result reader
- **THEN** the owning scope SHALL dispose the handle after apply or settlement completes
- **AND** failure paths SHALL dispose through `finally`
