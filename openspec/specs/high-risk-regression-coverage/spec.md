# high-risk-regression-coverage Specification

## Purpose
TBD - created by archiving change add-high-risk-smoke-and-regression-tests. Update Purpose after archive.
## Requirements
### Requirement: High-risk execution paths SHALL have explicit smoke coverage
The project SHALL provide smoke tests for high-risk user-facing execution paths identified during hardening.

#### Scenario: Critical execution chain has smoke test
- **WHEN** a high-risk critical path is identified
- **THEN** at least one smoke test covers its success path

#### Scenario: Smoke test belongs to lite suite where applicable
- **WHEN** smoke test validates a critical and fast path
- **THEN** it is eligible for `lite` suite membership

### Requirement: Backend manager configuration flow SHALL have regression coverage
Configuration validation and persistence behavior in backend manager SHALL be covered with explicit regression tests.

#### Scenario: Invalid backend configuration is rejected
- **WHEN** backend rows contain invalid base URL, duplicate id, or missing bearer token
- **THEN** save path fails with deterministic error signaling and no invalid config is persisted

#### Scenario: Valid backend configuration is persisted
- **WHEN** backend rows pass validation
- **THEN** backend config is persisted and workflow menu refresh hook is triggered

### Requirement: Workflow apply seam failure branches SHALL be covered
Apply seam SHALL have explicit regression tests for critical failure branches that influence user-visible summary and diagnostics.

#### Scenario: Job record missing after queue drain
- **WHEN** apply seam iterates a job id that cannot be resolved from queue state
- **THEN** job outcome is failed with `record missing` reason and diagnostic stage indicates `job-missing`

#### Scenario: Target parent cannot be resolved
- **WHEN** job succeeds but target parent cannot be resolved before apply
- **THEN** job outcome is failed with `cannot resolve target parent` reason and apply is not executed

#### Scenario: Provider result misses requestId
- **WHEN** provider result lacks request identifier
- **THEN** job outcome is failed with `missing requestId` reason and diagnostic stage indicates provider-result issue

### Requirement: Fragile behavior SHALL have targeted regression tests
Known fragile or previously escaped behaviors SHALL be protected by explicit regression tests.

#### Scenario: Historical defect class gets regression case
- **WHEN** a defect class is marked high-risk
- **THEN** a regression test is added or updated to cover it

#### Scenario: Regression depth is assigned to appropriate suite
- **WHEN** regression test is long-running or environment-heavy
- **THEN** it is assigned to `full` suite

### Requirement: Declarative request compiler guardrails SHALL have negative tests
Declarative request compiler SHALL be protected by explicit tests for malformed selector and request-shape inputs.

#### Scenario: Selector cardinality violation
- **WHEN** selector-based attachment resolution does not produce exactly one match
- **THEN** compiler returns deterministic error and request is not emitted

#### Scenario: Duplicate upload key in declarative input
- **WHEN** upload file declarations contain duplicated keys
- **THEN** compiler rejects request construction with deterministic validation error

#### Scenario: generic-http steps declaration is incomplete
- **WHEN** `generic-http.steps.v1` request has no declared steps
- **THEN** compiler rejects request construction with deterministic validation error

### Requirement: Loader normalizeSettings diagnostics SHALL be covered
Workflow loader diagnostics for optional `normalizeSettings` hook SHALL be covered by regression tests.

#### Scenario: normalizeSettings hook file is missing
- **WHEN** manifest declares normalizeSettings hook path but file is absent
- **THEN** loader reports deterministic warning diagnostics for missing hook file

#### Scenario: normalizeSettings hook export is invalid
- **WHEN** normalizeSettings module loads but does not export expected function
- **THEN** loader reports deterministic warning diagnostics for export mismatch

### Requirement: Reinforcement tests SHALL be traceable to risk rationale
Each reinforcement test SHALL include traceability to the risk item or defect class it mitigates.

#### Scenario: Reviewer inspects added test
- **WHEN** reviewer checks new smoke/regression case
- **THEN** risk rationale is available in test metadata, comments, or linked backlog reference

### Requirement: ACP launch and close regressions SHALL execute in deterministic suites

High-risk ACP npx launch recovery and close-diagnostic behavior SHALL have deterministic Node coverage and a Zotero-compatible core test entry. Test selection SHALL fail when the intended Zotero test executes zero cases.

#### Scenario: Node regression suite runs without external agent dependency
- **WHEN** the ACP launch-cache, transport, client-close, and adapter regression tests run
- **THEN** deterministic fixtures SHALL exercise the required success and failure paths
- **AND** the suite SHALL NOT require a network package download or installed OpenCode agent

#### Scenario: Zotero core filter selects ACP integration test
- **WHEN** the targeted Zotero core ACP test command runs
- **THEN** the core suite entrypoint SHALL include the deterministic ACP integration test
- **AND** the gate SHALL verify that at least one test executed

#### Scenario: External OpenCode coverage remains opt-in
- **WHEN** the project runs its default deterministic test gates
- **THEN** external OpenCode ACP integration SHALL NOT be required
- **AND** the real-agent test SHALL remain available through an explicit integration-test command

