# workflow-input-planning-protocol Specification

## Purpose
Define the v2 workflow input planning protocol: the ordered pipeline from trigger gate through selection validation, candidate production, filtering, grouping, and prepared-unit emission.

## Requirements

### Requirement: Workflow input planning SHALL use a single ordered v2 pipeline
The system SHALL plan workflow input by applying the empty-selection trigger gate, raw selection requirements once, selector production, member compatibility, ordered filters, candidate requirements, and grouping in that order.

#### Scenario: Global parent requirement with each grouping
- **WHEN** a confirmed plan requires at least two selected parents and groups valid parent candidates with `each`
- **THEN** the system validates the original selection once and emits one executable unit per parent without revalidating the global requirement per unit

### Requirement: Inputs and validation SHALL have distinct responsibilities
`inputs.member` SHALL be the only declaration of the atomic input type consumed by build and preflight, `inputs.grouping` SHALL be the only declaration of top-level grouping, and `validateSelection` SHALL only produce, filter, and validate candidates.

#### Scenario: Selector output is incompatible with the member contract
- **WHEN** a manifest selector has a declared output kind incompatible with `inputs.member.kind`
- **THEN** the loader rejects the manifest before execution

### Requirement: Candidate and unit models SHALL be ordered and immutable
Each candidate SHALL expose a kind, stable identity, label, scoped selection context, and optional parent identity. Each prepared unit SHALL expose ordered members and member identities, member count, merged scoped context, a safe label, and an optional shared target parent.

#### Scenario: Admission follows confirmed planning
- **WHEN** a confirmed plan has been admitted for execution
- **THEN** downstream build, preflight, duplicate guarding, and queueing use the same immutable unit membership without replanning or regrouping

### Requirement: Grouping SHALL be deterministic
The system SHALL support `each`, `all`, and `parent` grouping. Parent grouping SHALL preserve first-seen group and member order and SHALL skip candidates without stable parent identity using reason `missing-parent`.

#### Scenario: Attachment candidates span two parents
- **WHEN** ordered attachment candidates reference two stable parent identities
- **THEN** parent grouping emits two units ordered by each parent's first candidate and preserves first appearance within each unit

### Requirement: Candidate and unit statistics SHALL remain separate
The plan SHALL report original selection counts, candidate statistics, and unit statistics separately. Zero valid final units SHALL fail with `NO_VALID_INPUT_UNITS` even if no candidate minimum is declared.

#### Scenario: Orphan candidate is removed before grouping
- **WHEN** parent grouping encounters one orphan and one groupable candidate
- **THEN** the orphan increments candidate skipped statistics and the surviving group remains one execution unit

### Requirement: Preview and confirmed planning SHALL have explicit filter phases
Preview planning SHALL apply only availability-safe rules, while confirmed planning SHALL reapply availability rules and execute-phase rules and SHALL be the execution SSOT.

#### Scenario: Parameter-dependent artifact filter
- **WHEN** an artifact exclusion depends on confirmed workflow parameters
- **THEN** the manifest requires `phase: "execute"` and preview does not apply that filter

### Requirement: Host queue admission SHALL consume confirmed v2 prepared units
Host queue admission SHALL occur only after the Host has produced a confirmed Input Planning v2 plan and duplicate guarding has selected unchanged prepared units.

#### Scenario: Remote client submits workflow input
- **WHEN** a Host Bridge client submits a workflow
- **THEN** the client SHALL provide explicit raw `selection`
- **AND** the Host SHALL reject client-supplied candidates, input plans, prepared units, or grouping results

#### Scenario: Prepared unit reaches admission
- **WHEN** an allowed prepared unit enters the submission seam
- **THEN** its member order, member count, group identity, scoped context, and task label SHALL remain immutable
- **AND** downstream execution SHALL NOT rerun raw-selection requirements or grouping

