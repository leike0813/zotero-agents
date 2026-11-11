## MODIFIED Requirements

### Requirement: Filesystem effects SHALL use complete safe operation paths

Runtime persistence SHALL validate complete file, directory, and component path budgets against the actual operation's native or interoperability capability before filesystem effects. Relative paths SHALL include their absolute working-directory basis. Inventory warnings SHALL NOT authorize an over-budget operation.

#### Scenario: Applying platform budgets

- **WHEN** a complete destination is validated
- **THEN** Windows interoperability files SHALL fit 259 UTF-16 units and directories 247, excluding NUL
- **AND** native Windows operations SHALL admit supported extended paths within the native complete-path budget
- **AND** components SHALL fit 255 UTF-16 units on Windows or 255 UTF-8 bytes on POSIX
- **AND** POSIX paths SHALL fit the runtime's byte budget
- **AND** generated portable names SHALL retain their separate UTF-8 cap.

#### Scenario: Generated intermediate paths would exceed the budget

- **WHEN** an atomic write or directory copy needs staging or backup paths
- **THEN** it SHALL use short internal names independent of the destination basename
- **AND** every known final and intermediate destination SHALL be validated before old content is moved
- **AND** insufficient remaining budget SHALL fail with structured numeric evidence under the required consumer policy.

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

## ADDED Requirements

### Requirement: Native Windows paths SHALL remain an adapter detail

Ordinary supported Windows file operations SHALL accept long absolute paths without requiring a system-setting change. All native path arguments and derived paths SHALL be adapted consistently. Public descriptors SHALL retain ordinary paths. Invalid device namespaces and unsupported capabilities SHALL fail safely.

#### Scenario: Long source is copied to a short target

- **WHEN** a readable ordinary Windows source exceeds the interoperability limit
- **THEN** a native-capable copy SHALL preserve its bytes without rejecting it solely at 259 units.

#### Scenario: An enumerated child is used again

- **WHEN** a native long directory is enumerated and its returned child is read or copied
- **THEN** the returned path SHALL be usable through the same public file interface without exposing an internal extended prefix.

### Requirement: Compatibility staging SHALL preserve ownership and output identity

Generated temporary paths SHALL use bounded physical names independent of display and run identities. A short-path-only consumer SHALL receive an owned compatible copy when necessary. Compatible copies SHALL participate in temporary usage, retention and in-use protection. Completed output SHALL be staged on the destination volume before atomic publication.

#### Scenario: Display name would produce a long staging target

- **WHEN** a workflow stages a file with a long display name or run identity
- **THEN** it SHALL allocate a unique bounded physical path and preserve the display identity.

#### Scenario: Managed staging root is too deep

- **WHEN** the managed temporary root cannot fit known interoperability destinations
- **THEN** a validated system-temporary candidate SHALL be used without moving existing data
- **AND** if no candidate fits the operation SHALL fail before touching the target.

#### Scenario: Temporary cleanup races a compatibility consumer

- **WHEN** compatibility input or recovery output is still owned by an active operation
- **THEN** cleanup SHALL report in-use and preserve those bytes and other profiles' directories.
