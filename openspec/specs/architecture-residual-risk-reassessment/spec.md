# architecture-residual-risk-reassessment Specification

## Purpose
TBD - created by archiving change reassess-architecture-residual-risks. Update Purpose after archive.
## Requirements
### Requirement: Reassessment SHALL produce a normalized residual-risk register

The reassessment process SHALL output a residual-risk register where each risk entry uses a consistent schema so results are comparable and auditable across iterations.

#### Scenario: Mandatory risk entry fields are present

- **WHEN** a reassessment is completed
- **THEN** each risk entry includes at least `id`, `area`, `statement`, `evidence`, `severity`, `impact`, `likelihood`, `owner`, `mitigation`, and `target_change`

#### Scenario: Evidence is traceable

- **WHEN** a risk entry references architecture concerns
- **THEN** the entry includes concrete evidence pointers to code, tests, docs, or change artifacts rather than only narrative claims

### Requirement: Reassessment SHALL apply explicit severity decision rules

The reassessment SHALL use explicit decision criteria for severity assignment so scoring is repeatable and not reviewer-dependent.

#### Scenario: Severity is assigned by defined rubric

- **WHEN** a risk is scored
- **THEN** the score is derived from documented impact/likelihood criteria rather than ad-hoc judgment

#### Scenario: Previously mitigated areas are re-validated

- **WHEN** an area was marked mitigated in earlier hardening work
- **THEN** reassessment still records no-regression evidence before marking the risk as retired

### Requirement: Reassessment SHALL remain baseline-constrained

The reassessment SHALL evaluate only baseline-defined concerns and MUST NOT expand into unrelated roadmap planning.

#### Scenario: Assessment source is baseline-defined

- **WHEN** the reassessment is executed
- **THEN** assessed items are derived from `artifacts/archive/architecture-hardening-baseline.md` (debt register, boundaries, acceptance criteria), with explicit out-of-scope notes for anything else

#### Scenario: Future roadmap expansion is excluded

- **WHEN** the reassessment report is published
- **THEN** it does not require linkage to not-yet-implemented future changes as a completion condition

### Requirement: Reassessment SHALL define closure states and acceptance gates

The reassessment process SHALL define explicit closure states so each identified risk can be tracked to a clear disposition.

#### Scenario: Closure states are explicit

- **WHEN** reassessment is published
- **THEN** each risk is labeled with one of `accepted`, `planned`, or `retired`

#### Scenario: Retired risk requires acceptance evidence

- **WHEN** a risk is marked `retired`
- **THEN** the entry includes verification evidence showing mitigation has been implemented and validated

### Requirement: Reassessment deliverable SHALL be published as project documentation

The reassessment result SHALL be published under `artifacts/archive/` and linked from the baseline document for long-term discoverability.

#### Scenario: Doc publication

- **WHEN** reassessment implementation is completed
- **THEN** a baseline reassessment report exists under `artifacts/archive/` and includes scope, rubric, risk entries, and closure outcomes

#### Scenario: Baseline linkage

- **WHEN** a reader opens `artifacts/archive/architecture-hardening-baseline.md`
- **THEN** the document contains a clear pointer to the reassessment report
