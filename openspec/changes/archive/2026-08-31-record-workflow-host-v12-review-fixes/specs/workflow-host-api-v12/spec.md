## ADDED Requirements

### Requirement: Workflow hook runs SHALL wire execution control into scoped host APIs
Each workflow hook run SHALL create one runtime-owned abort signal, link (never replace) any upstream caller signal, and compose a scoped Workflow Host whose members fall back to that signal as their default `WorkflowCallControl` when the caller omits control. An explicit caller control, including an empty object, SHALL be respected over the default. The scoped host SHALL bind workflow input materialization to the current workflow/run identity. File, archive, and metadata members SHALL check the effective control signal and MUST NOT publish late success results after cancellation.

#### Scenario: Caller omits control
- **WHEN** a workflow invokes a file, archive, or metadata member without a control argument
- **THEN** the member executes under the hook run's execution signal and cancellation of the run cancels the call

#### Scenario: Caller passes explicit control
- **WHEN** a workflow invokes the same member with its own control object
- **THEN** the explicit control governs the call and the run default is not substituted

### Requirement: File, archive, and input materialization members SHALL use the aligned v12 contract
File picker members SHALL accept the bounded `initialDirectory`/`filters` request DTO; `file.makeDirectory` SHALL support explicit recursive creation. Archive members SHALL accept `{ entries }` request shapes whose entry content is a closed discriminated union, report per-entry `sizeBytes`, detect duplicate entry paths under a single case-folded comparison, and verify written output against the measured plan before returning success. `archive.withExtractedZip` SHALL use the (input, control, callback) signature, scope extracted access to the callback lifetime, and fail closed on cancellation. File and archive failures SHALL use the stable Workflow Host error taxonomy rather than raw runtime exceptions.

#### Scenario: Duplicate archive entries differ only by case
- **WHEN** a write request contains two entry paths that fold to the same comparison key
- **THEN** the request fails with a stable duplicate-value error before any archive is written

#### Scenario: Written archive disagrees with the measured plan
- **WHEN** post-write verification finds the produced files differ from the measured entries or byte counts
- **THEN** the write fails instead of returning a success measurement

#### Scenario: Extraction callback returns after cancellation
- **WHEN** the control signal aborts while an extraction callback is running
- **THEN** `withExtractedZip` fails with a stable canceled error and does not publish the callback result

### Requirement: Synthesis facade failures SHALL use the Workflow Host error contract
Every Synthesis member of the Workflow Host surface SHALL normalize failures through the shared Workflow Host error contract before they reach workflow callers. Synthesis sidecar conflict tokens SHALL map to stable conflict reasons (for example `tag_audit_operation_in_progress` maps to `operation_in_progress`), unavailable or timeout conditions SHALL map to the stable unavailable outcome, and unrecognized failures SHALL map to a stable execution failure. Sidecar-internal codes, reasons, and storage details MUST NOT appear in error details exposed to workflows.

#### Scenario: Sidecar reports a tag-audit conflict
- **WHEN** the sidecar rejects a call with a known tag-audit conflict token
- **THEN** the workflow receives a stable `conflict` error whose reason is the mapped taxonomy value, with no sidecar reason or code in details

#### Scenario: Sidecar fails with an unrecognized error
- **WHEN** the sidecar failure matches no known mapping
- **THEN** the workflow receives a stable `execution_failed` error with adapter-phase recovery semantics

### Requirement: V12 owner DTOs SHALL match the frozen architecture shapes
Owner-level request and result DTOs SHALL carry the fields frozen by the architecture record: related-item mutation results SHALL report a closed outcome enum and the post-write source revision, and SHALL reject self-relation, cross-library, and inactive endpoints at validation; stable issue DTOs SHALL be a closed five-variant union that distinguishes attachment file missing, unreadable, and permission-denied conditions; collection mutations SHALL validate placement against cycles and cross-library parents, normalize membership deltas through one shared validation path, bound removal preview pagination, and read collection versions fail-closed; library snapshot items SHALL carry structured creators and identifier fields; `editor.openSession` SHALL honor an explicit detached request by bypassing the caller session queue instead of silently dropping the flag.

#### Scenario: Related-item mutation reports verified outcome
- **WHEN** `item.addRelated` or `item.removeRelated` completes
- **THEN** the result carries the added/removed/already-present/already-absent outcome and the confirmed source revision from the post-write read

#### Scenario: Detached editor session is requested
- **WHEN** a caller opens an editor session with `detached: true`
- **THEN** the session opens without entering the caller-scoped queue and the flag is not silently ignored

#### Scenario: Collection placement would create a cycle
- **WHEN** a collection create or update places the collection under itself or its descendant
- **THEN** validation fails before any write with a stable invalid-request error
