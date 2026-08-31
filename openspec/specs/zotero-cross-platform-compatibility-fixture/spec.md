# zotero-cross-platform-compatibility-fixture Specification

## Purpose

Defines reproducible execution of this plugin against exact Zotero desktop releases on each supported operating system, including trustworthy artifacts, isolated state, cleanup, and reviewable evidence.

## Requirements

### Requirement: Compatibility targets have one content-addressed manifest

The fixture SHALL load target version, platform, architecture, immutable official download location, archive digest, archive format, expected executable, suite policy, and gate policy from one versioned manifest. A selected target SHALL fail before launch when the running platform differs, the requested version is absent, downloaded bytes do not match the declared SHA-256 digest, or the extracted `application.ini` version differs from the target.

#### Scenario: Cached archive digest does not match

- **WHEN** a selected target's cached archive does not match its declared digest
- **THEN** the fixture SHALL discard the cache hit and reacquire the archive
- **AND** it SHALL fail without extraction if reacquired bytes still do not match

#### Scenario: Target is not declared

- **WHEN** a caller requests a version, platform, or architecture combination absent from the manifest
- **THEN** the fixture SHALL fail with a structured selection error before creating a host session

### Requirement: Host extraction rejects unsafe archive entries

The fixture SHALL inspect archive entries before extraction and reject absolute paths, drive-qualified paths, parent traversal, symbolic links, hard links, devices, and entries escaping the target staging directory. A host installation SHALL become reusable only after extraction and executable validation complete in staging.

#### Scenario: Archive contains a traversal entry

- **WHEN** a host archive contains an entry whose normalized path escapes the extraction root
- **THEN** acquisition SHALL fail
- **AND** the partial extraction SHALL NOT be published as an installed host

### Requirement: Every real-host run owns isolated state and processes

Each run SHALL use a run-local host copy plus unique profile, Zotero data, test-resource, runtime, diagnostics, receipt, and network-port state. The shared extracted host SHALL NOT be launched directly. Cleanup SHALL first request graceful termination and then force only process identifiers or process groups created by that run. The fixture SHALL NOT terminate Zotero processes it did not start, and one desktop session SHALL serialize GUI hosts to avoid Zotero single-instance forwarding across targets.

#### Scenario: Host test reaches its timeout

- **WHEN** a real-host run exceeds its configured deadline
- **THEN** the fixture SHALL record a timeout failure
- **AND** it SHALL stop only the run-owned process tree
- **AND** it SHALL attempt removal of the run's ephemeral state

### Requirement: Behavioral runs reuse the project's normative suites

The fixture SHALL execute the existing `lite` or `full` Zotero suite membership without creating a second test taxonomy. It SHALL build the plugin artifact once per workflow and SHALL use an external host session runner that does not rebuild or replace that artifact inside each matrix cell.

#### Scenario: Full compatibility target is selected

- **WHEN** a compatibility target runs in `full` mode
- **THEN** it SHALL execute the retained `core:full`, `ui:full`, and `workflow:full` segments sequentially
- **AND** failure of any segment SHALL fail the target receipt

### Requirement: Formal XPI smoke verifies install lifecycle

The fixture SHALL support installing the canonical built XPI through Zotero's add-on manager, verifying the plugin startup marker, disabling or uninstalling it, and verifying the shutdown marker. This path SHALL NOT substitute temporary development-addon installation for formal XPI installation.

#### Scenario: Installed XPI does not activate

- **WHEN** the add-on manager reports installation success but the plugin startup marker is not observed before the deadline
- **THEN** the smoke run SHALL fail
- **AND** it SHALL retain host logs and add-on state diagnostics in the receipt artifacts

### Requirement: Every selected target emits a structured receipt

The fixture SHALL write a receipt even when acquisition, launch, execution, or cleanup fails. The receipt SHALL identify requested and observed host version, platform, architecture, suite, plugin artifact digest, host archive digest, timestamps, outcome, phase results, diagnostic paths, cleanup outcome, and structured errors.

#### Scenario: Launch fails before a host connection is ready

- **WHEN** Zotero exits or fails before the automation connection becomes ready
- **THEN** the receipt SHALL identify the launch phase as failed
- **AND** it SHALL preserve available stdout, stderr, profile, and runtime diagnostic locations

### Requirement: Supported compatibility matrix is explicit

Windows x64 and Linux x64 SHALL run Zotero 7.0.32, 9.0.6, and 10.0.1 behavioral and formal-XPI coverage as blocking targets. macOS Intel and ARM64 SHALL run Zotero 10.0.1 formal-XPI smoke as non-blocking evidence until promoted by a later policy change.

#### Scenario: Pull request matrix is planned

- **WHEN** CI requests the pull-request compatibility plan
- **THEN** it SHALL contain the six blocking Windows/Linux lite behavioral targets
- **AND** it SHALL omit full behavioral targets

#### Scenario: Main or release matrix is planned

- **WHEN** CI requests the main or release compatibility plan
- **THEN** it SHALL contain six blocking Windows/Linux full behavioral targets and six blocking formal-XPI targets
- **AND** it SHALL contain two non-blocking macOS Zotero 10 formal-XPI targets
