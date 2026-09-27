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

The fixture SHALL execute the existing `lite`, `full`, or `e2e` Zotero suite membership without creating a second test taxonomy. Membership SHALL come directly from the authoritative suite directories rather than aggregate imports, file allowlists, or title allowlists. It SHALL build the plugin artifact once per workflow and SHALL prepare each required current-source sidecar target before cell execution. An external host session runner SHALL verify and consume those immutable artifacts without rebuilding or replacing either artifact inside a matrix cell.

#### Scenario: Full compatibility target is selected

- **WHEN** a compatibility target runs in `full` mode
- **THEN** it SHALL execute the retained `core:full`, `ui:full`, and `workflow:full` segments sequentially
- **AND** failure of any segment SHALL fail the target receipt

#### Scenario: E2E compatibility target is selected

- **WHEN** a compatibility target runs the `e2e` domain
- **THEN** it SHALL execute the selected complete Scenario Family grouping through `tests/zotero/e2e/full`
- **AND** it SHALL use one fresh copied profile for that invocation
- **AND** its receipt SHALL retain the verified plugin digest, sidecar fingerprint, and terminal Run Manifest reference

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

Windows x64 and Linux x64 SHALL retain Zotero 7.0.32, 9.0.6, and 10.0.1 behavioral and formal-XPI coverage. System E2E cells SHALL be planned separately: pull requests use Zotero 10/Linux `SL+PM`; main uses all Phase 1 families on Zotero 7/9/10 Linux; release uses all Phase 1 families on Zotero 7/9/10 Linux and Windows. Every prospective blocking E2E cell SHALL remain non-blocking until calibrated and explicitly promoted. macOS Intel and ARM64 SHALL retain Zotero 10.0.1 formal-XPI smoke as non-blocking evidence.

#### Scenario: Pull request matrix is planned

- **WHEN** CI requests the pull-request compatibility plan
- **THEN** it SHALL contain the existing supported lite behavioral targets
- **AND** it SHALL contain one Zotero 10/Linux E2E cell for `SL+PM`
- **AND** the E2E cell SHALL be non-blocking until its exact calibration identity is promoted

#### Scenario: Main matrix is planned

- **WHEN** CI requests the main compatibility plan
- **THEN** it SHALL contain Zotero 7, 9, and 10 Linux E2E cells covering all six Phase 1 families
- **AND** each cell's gate state SHALL follow only its explicit promotion configuration

#### Scenario: Release matrix is planned

- **WHEN** CI requests the release compatibility plan
- **THEN** it SHALL contain Zotero 7, 9, and 10 Linux and Windows E2E cells covering all six Phase 1 families
- **AND** it SHALL retain two non-blocking macOS Zotero 10 formal-XPI targets
- **AND** each E2E cell SHALL verify final tag-bound plugin and sidecar identities before publication

#### Scenario: Main or release matrix is planned

- **WHEN** CI requests the main or release compatibility plan
- **THEN** it SHALL retain the supported full behavioral and formal-XPI targets for that lane
- **AND** it SHALL add only the E2E cells defined for that lane and their explicit promotion state

### Requirement: E2E execution cells SHALL carry complete identity and calibration evidence

An E2E execution cell SHALL identify its trigger lane, exact Zotero and platform target, Scenario Family grouping, runner environment, fixture scale class, invocation/profile model, blocking state, plugin artifact digest, and sidecar fingerprint. Calibration SHALL require three complete clean Run Manifests from three independent workflow executions with matching identity and a fresh profile per round. Invalid cleanup, health, process, port, lock, identity, or terminal state SHALL invalidate the round.

#### Scenario: Cell has three clean rounds

- **WHEN** three independent executions produce complete clean manifests for the same cell identity
- **THEN** the evidence MAY be submitted for human review and explicit promotion
- **AND** promotion of unrelated cells is not required

#### Scenario: Calibration identity changes

- **WHEN** the Zotero version, runner OS/image, family grouping, fixture scale, sidecar startup model, or invocation/profile model changes
- **THEN** prior rounds SHALL NOT satisfy calibration for the new identity

#### Scenario: Clean rounds exceed the grouping threshold

- **WHEN** the maximum of three clean round durations exceeds the lane's candidate grouping threshold
- **THEN** regrouping SHALL preserve whole families and use the defined Synthesis-versus-Host-Bridge then `SL/PM`, `RH/PA/CG`, `HB` split order
- **AND** each resulting cell SHALL calibrate independently

### Requirement: Non-gating E2E evidence lanes SHALL remain explicit

Weekly scheduled runs SHALL cover the release-equivalent Linux and Windows matrix, scheduled stress SHALL run the selected Zotero 10/Linux stress scenario, and manual large-gold SHALL run `RH`, `PA`, `PM`, and `CG` on Zotero 10/Linux. These lanes SHALL remain non-gating. Selecting private large-gold execution SHALL fail that invocation when its read-only source is missing or invalid.

#### Scenario: Non-gating lanes are planned

- **WHEN** an operator requests weekly, stress, or private large-gold evidence
- **THEN** the planner SHALL emit only the lane's fixed targets and family grouping
- **AND** no result SHALL become release authority or silently change a blocking cell
