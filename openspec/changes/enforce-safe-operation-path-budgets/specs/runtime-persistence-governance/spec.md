# Spec Delta

## ADDED Requirements

### Requirement: Filesystem effects SHALL use complete safe operation paths

Runtime persistence SHALL validate complete file, directory, and component path
budgets before filesystem effects. Relative paths SHALL include their absolute
working-directory basis. Inventory warnings SHALL NOT authorize an over-budget
operation.

#### Scenario: Applying platform budgets

- **WHEN** a complete destination is validated
- **THEN** Windows files SHALL fit 259 UTF-16 units and directories 247, excluding NUL
- **AND** components SHALL fit 255 UTF-16 units on Windows or 255 UTF-8 bytes on POSIX
- **AND** POSIX paths SHALL fit the runtime's byte budget
- **AND** generated portable names SHALL retain their separate UTF-8 cap.

#### Scenario: Generated intermediate paths would exceed the budget

- **WHEN** an atomic write or directory copy needs staging or backup paths
- **THEN** it SHALL use short internal names independent of the destination basename
- **AND** every known final and intermediate destination SHALL be validated before old content is moved
- **AND** insufficient remaining budget SHALL fail with structured numeric evidence without a long-path bypass.

#### Scenario: A temporary directory already belongs to another owner

- **WHEN** exclusive reservation finds an existing directory
- **THEN** reservation SHALL fail as a conflict
- **AND** the failed claimant SHALL NOT write into or remove that directory.

#### Scenario: Moving a directory would lengthen a child beyond its budget

- **WHEN** a directory move contains an over-budget descendant destination or cannot complete bounded inspection
- **THEN** the move SHALL fail before changing the source or destination.

#### Scenario: Archive extraction contains an unsafe complete destination

- **WHEN** any known ZIP member destination is over budget
- **THEN** extraction SHALL fail before writing the first member
- **AND** workflow bundle extraction SHALL preflight the member identities used by its extractor.

#### Scenario: Native overwrite is rejected

- **WHEN** the filesystem rejects an overwrite
- **THEN** runtime persistence SHALL preserve the failure
- **AND** SHALL NOT delete the old file in order to retry creation.

#### Scenario: Tree promotion outcome cannot be inspected

- **WHEN** a tree move may have taken effect and subsequent inspection fails
- **THEN** possible backups SHALL remain available
- **AND** an inspection error SHALL NOT be interpreted as evidence of absence for cleanup.
