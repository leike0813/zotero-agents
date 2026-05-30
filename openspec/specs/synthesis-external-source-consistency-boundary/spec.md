## ADDED Requirements

### Requirement: Zotero external source drift is classified

The project SHALL document startup reconcile as classifying Zotero external source drift into small, bulk, or structural severity before deciding whether to enqueue incremental work.

#### Scenario: Small drift is bounded

- **WHEN** startup reconcile detects a small number of safe item or artifact changes
- **THEN** it may enqueue bounded registry cache dirty events
- **AND** it must still obey reconcile scan and queue budgets.

#### Scenario: Bulk drift is detected

- **WHEN** startup reconcile detects drift above configured count, ratio, or time-budget thresholds
- **THEN** it records a bounded source drift summary
- **AND** it recommends explicit registry/graph cache rebuild instead of expanding every item into dirty events.

#### Scenario: Structural drift is detected

- **WHEN** startup reconcile detects invalid identity assumptions, widespread payload decode failures, impossible binding collisions, or scan exhaustion
- **THEN** it fails closed into diagnostic/repair-required state
- **AND** it does not continue incremental processing as if the source were trustworthy.

### Requirement: External source validation occurs at ingress

The project SHALL document that defensive validation for Zotero items, notes, attachments, and artifact payloads occurs at adapter/materializer ingress rather than in every internal worker.

#### Scenario: Adapter reads Zotero item input

- **WHEN** a Zotero item is read for Synthesis materialization
- **THEN** the ingress boundary validates item existence, library id, item key, top-level regular item status, and binding consistency.

#### Scenario: Adapter reads artifact note input

- **WHEN** an artifact note payload is read
- **THEN** the ingress boundary validates payload decode status, payload hash, parent item consistency, and supported artifact type.

### Requirement: Bulk or structural drift does not fan out

The project SHALL document that bulk or structural external source drift must not expand into unbounded dirty events, graph jobs, review items, topic source checks, discovery work, or permanent active statusbar jobs.

#### Scenario: Batch duplicate merge occurs while plugin is not running

- **WHEN** startup reconcile detects many missing or merged Zotero-bound bindings
- **THEN** it records a bounded drift incident
- **AND** it does not enqueue per-item deletion review and graph jobs for every affected item by default.

#### Scenario: Bulk drift is shown in UI

- **WHEN** Workbench reads Synthesis maintenance state after bulk drift detection
- **THEN** it shows a bounded diagnostic and recommended commands
- **AND** it does not display an unbounded or permanently queued task list.

### Requirement: Topics are isolated from external source drift fan-out

The project SHALL document that Zotero external drift is handled within Paper Registry Cache and Citation Graph maintenance boundaries and does not automatically mark Topics stale or enqueue topic source-check/discovery work.

#### Scenario: Zotero batch operation changes saved topic sources

- **WHEN** external Zotero drift affects items that a topic previously used
- **THEN** the topic artifact remains unchanged
- **AND** the difference is discoverable through explicit topic source check or topic update flow.

### Requirement: Drift incidents have explicit recovery actions

The project SHALL document that bulk and structural source drift incidents expose explicit recovery commands instead of silent partial repair.

#### Scenario: User reviews a bulk drift incident

- **WHEN** the user or debug tool inspects a bulk drift incident
- **THEN** the system reports counts, severity, thresholds, bounded examples, and recommended actions such as inspect drift, run registry/graph cache rebuild, or reset Synthesis DB.
