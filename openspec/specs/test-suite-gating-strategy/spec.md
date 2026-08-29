# test-suite-gating-strategy Specification

## Purpose
TBD - created by archiving change define-lite-full-suite-and-ci-gates. Update Purpose after archive.
## Requirements
### Requirement: The project SHALL define two normative test suites
The project SHALL define two normative test suites: `lite` for pull request gating and `full` for release gating.

#### Scenario: PR gate uses lite suite
- **WHEN** a pull request gate runs
- **THEN** it executes the `lite` suite

#### Scenario: Release gate uses full suite
- **WHEN** a release gate runs
- **THEN** it executes the `full` suite

### Requirement: Full suite SHALL be a superset of lite suite

`full` suite membership SHALL include all tests in `lite` plus additional deep
regression coverage.

#### Scenario: Additional deep tests are only in full

- **WHEN** environment-heavy, long-running, or intentionally down-tiered test
  cases are classified
- **THEN** they are allowed in `full` without being required in `lite`
- **AND** case-level `itFullOnly` gating MAY be used to keep those cases inside
  the same file while excluding them from `lite`

### Requirement: Lite suite SHALL be explicitly optimized for fast feedback

`lite` suite membership SHALL be reviewed and pruned to keep PR feedback fast
while preserving critical-path confidence.

#### Scenario: Zotero lite retains a daily real-host regression ring

- **WHEN** Zotero `lite` routine suites are selected
- **THEN** they MUST include host smoke plus a small set of real-host parity
  cases for object operations, backend handoff, workflow context, and UI shell
  behavior
- **AND** they remain substantially smaller than broad historical Zotero
  coverage

#### Scenario: Zotero full remains a strict superset of Zotero lite

- **WHEN** Zotero `full` routine suites are selected
- **THEN** they MUST execute every retained `lite` case
- **AND** they MUST add an extra parity ring of guard, idempotency, and
  real-host regression cases

#### Scenario: Workflow Zotero coverage uses lite baseline plus full parity

- **WHEN** a workflow package is retained in routine Zotero execution
- **THEN** `lite` MUST keep a canonical success path and only the smallest
  necessary host-parity guards
- **AND** `full` MAY add a small number of extra host-safe guards without
  reintroducing deep matrix coverage

### Requirement: Lite selection-context rebuild SHALL use mix-all top-3-parent subset
For `selection-context rebuild`, `lite` SHALL execute only a dedicated fixture derived from the first three parent entries of `selection-context-mix-all`.

#### Scenario: Lite rebuild scope uses top-3 parents only
- **WHEN** `selection-context rebuild` runs in `lite` mode
- **THEN** the test uses only the top-3-parent derived fixture and excludes standalone notes from `mix-all`

#### Scenario: Lite rebuild keeps artifacts
- **WHEN** the top-3-parent rebuild case completes in `lite`
- **THEN** rebuilt artifacts are preserved (no cleanup teardown)

#### Scenario: Full rebuild remains comprehensive
- **WHEN** `selection-context rebuild` runs in `full` mode
- **THEN** the existing comprehensive fixture matrix continues to run

### Requirement: CI gating behavior SHALL define blocking semantics
The CI strategy SHALL define blocking vs warning behavior for each gate job. Pull requests SHALL block on the Windows x64 and Linux x64 Zotero 7.0.32, 9.0.6, and 10.0.1 `lite` behavioral matrix. Main and release runs SHALL block on the corresponding `full` behavioral matrix and formal-XPI smoke matrix. macOS Intel and ARM64 Zotero 10 formal-XPI smoke SHALL report evidence without blocking until separately promoted.

#### Scenario: Blocking gate failure
- **WHEN** any selected Windows/Linux compatibility target fails its required behavioral or formal-XPI run
- **THEN** the corresponding pipeline is marked failed

#### Scenario: Non-blocking informational job failure
- **WHEN** a macOS evidence target or another explicitly non-gating informational job fails
- **THEN** it is reported as warning without overriding mandatory gate results

### Requirement: Grouped test commands SHALL be provided at first-level domains
The project SHALL provide grouped test commands for both Node and Zotero runs at first-level domains only: `core`, `ui`, and `workflow`.

#### Scenario: Node grouped command by first-level domain
- **WHEN** a developer runs a Node grouped command for `core`, `ui`, or `workflow`
- **THEN** only tests in the selected first-level domain are executed

#### Scenario: Zotero grouped command by first-level domain
- **WHEN** a developer runs a Zotero grouped command for `core`, `ui`, or `workflow`
- **THEN** only tests in the selected first-level domain are executed

#### Scenario: Per-workflow grouped commands are not required in this change
- **WHEN** grouped commands are defined for this change
- **THEN** command surface is limited to first-level domain groups and does not require per-workflow command variants

### Requirement: Full suite SHALL serve as the stable CI host-coverage gate

Zotero `full` SHALL be a strict superset of Zotero `lite`, but its purpose is
not merely to add a narrow parity ring. Its purpose is to provide stable
real-host coverage for CI gate use.

#### Scenario: Zotero full prioritizes stable host coverage over speed

- **WHEN** Zotero `full` routine suites are selected
- **THEN** they MUST include every retained `lite` case
- **AND** they MUST add stable real-host suites or guards that improve coverage
  across major host-risk buckets
- **AND** they MUST not be optimized primarily for speed

#### Scenario: Zotero full is evaluated by coverage buckets

- **WHEN** Zotero `full` routine suites are curated
- **THEN** they MUST cover:
  - Zotero object lifecycle
  - SkillRunner transport/state/reconcile
  - workflow host context and idempotency
  - UI host shell behavior
- **AND** a full suite is incomplete when one of these buckets has no retained
  stable real-host coverage

### Requirement: Zotero full MAY run as sequential real-host domain segments

Release gating SHALL continue to use the `full` suite. Zotero real-host `full`
execution SHALL support sequential multi-process execution instead of requiring
one monolithic process.

#### Scenario: Release gate runs Zotero full as sequential real-host segments

- **WHEN** a release gate runs the Zotero `full` suite
- **THEN** it MAY execute `full` as multiple sequential real-host processes
- **AND** the default retained execution topology SHALL run:
  - `core:full`
  - `ui:full`
  - `workflow:full`
- **AND** failure in any segment SHALL fail the overall `full` gate

#### Scenario: Process splitting does not shrink full coverage

- **WHEN** Zotero `full` is executed as sequential segments
- **THEN** membership and gating semantics SHALL remain identical to the
  retained `full` suite contract
- **AND** process splitting SHALL be treated as an execution-topology change,
  not a coverage reduction

