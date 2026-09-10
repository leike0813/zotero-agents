## MODIFIED Requirements

### Requirement: Pull requests SHALL run both deterministic Node and real-host guards

Pull-request gates SHALL require deterministic Node coverage and the critical real-Zotero guard.

#### Scenario: PR gate

- **WHEN** the pull-request gate runs
- **THEN** governance checks and Synthesis native stage1 run
- **AND** all regular deterministic Node shards run
- **AND** Zotero `lite` runs
- **AND** failure in any stage blocks the gate

### Requirement: Releases SHALL run the full real-host layer

Release gates SHALL require the complete real-Zotero layer in addition to pull-request coverage.

#### Scenario: Release gate

- **WHEN** the release gate runs
- **THEN** it runs the same checks and Node layers as the PR gate
- **AND** it runs Zotero `full`
- **AND** `full` includes every `lite` file plus the files under each `full` directory

### Requirement: Test membership SHALL have one source of truth

Each test runner SHALL derive membership from one authoritative inventory.

#### Scenario: Node inventory

- **WHEN** Node tests are listed
- **THEN** each regular test is assigned to exactly one ownership shard
- **AND** unassigned or duplicate assignments fail the command

#### Scenario: Zotero inventory

- **WHEN** Zotero tests are selected
- **THEN** membership comes directly from `tests/zotero/{core,ui,workflow}/{lite,full}`
- **AND** aggregate import suites, file allowlists, and title allowlists are not used

### Requirement: Domain commands SHALL follow production ownership

Node domain commands SHALL execute shards grouped by production ownership.

#### Scenario: Node domain command

- **WHEN** `test:node:<domain>` runs
- **THEN** it executes only the shards owned by that production domain
- **AND** a failing shard prints a direct single-shard rerun command

#### Scenario: Native suite is not duplicated

- **WHEN** regular Node shards run in a gate that also runs Synthesis native stage1
- **THEN** native stage1 files are excluded from regular shards

### Requirement: Real-host compatibility SHALL remain blocking on supported targets

Supported real-host compatibility targets SHALL remain blocking.

#### Scenario: Compatibility matrix

- **WHEN** the compatibility gate runs
- **THEN** Zotero 7, 9, and 10 on supported Linux and Windows targets remain blocking
- **AND** explicitly informational macOS evidence does not override blocking results

### Requirement: Zotero full MAY use sequential domain processes

The full Zotero layer MAY isolate domains in sequential host processes and SHALL preserve complete membership and failure propagation when it does.

#### Scenario: Full execution topology

- **WHEN** `test:zotero:full` runs
- **THEN** core, UI, and workflow domains may run in separate sequential Zotero processes
- **AND** each domain loads its lite and full directories
- **AND** failure in any process fails the full suite
