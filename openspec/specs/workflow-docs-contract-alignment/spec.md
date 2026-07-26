## Purpose

Define and maintain implementation-aligned workflow documentation contracts, covering protocol docs, hook helper APIs, and hook-facing bridge semantics.

## Requirements

### Requirement: Workflow protocol docs SHALL match implemented hook/runtime contract

`doc/components/workflows.md` MUST reflect the currently implemented workflow contract, including supported hook set, request/build strategy behavior, and canonical rendering semantics.

#### Scenario: Hook set alignment

- **WHEN** workflow protocol docs describe available hooks
- **THEN** they include all currently supported hook entrypoints (including settings normalization hook support where implemented)

#### Scenario: Canonical table contract alignment

- **WHEN** workflow protocol docs describe shared reference table rendering
- **THEN** documented column order and source/locator semantics match runtime helper implementation

### Requirement: Hook helper documentation SHALL provide complete API reference

`doc/components/workflow-hook-helpers.md` MUST enumerate the full currently supported `runtime.helpers` surface with API-level behavior guidance.

#### Scenario: Full helper inventory

- **WHEN** a workflow author reads helper docs
- **THEN** each supported helper function is listed with signature, input/return expectations, and notable edge/error behavior

#### Scenario: Practical usage coverage

- **WHEN** helper docs provide examples
- **THEN** examples cover attachment-selection helpers and reference payload/table helpers

### Requirement: Hook-facing dialog/editor bridge APIs SHALL be documented

Workflow docs MUST explain hook-facing dialog/editor bridge usage, including ownership boundary and lifecycle semantics.

#### Scenario: Bridge boundary clarity

- **WHEN** docs describe dialog/editor integration
- **THEN** they clearly distinguish `runtime.helpers` APIs from bridge APIs exposed outside helpers

#### Scenario: Multi-input sequencing and cancel semantics

- **WHEN** docs describe editor/dialog behavior for multiple input units
- **THEN** they specify sequential dialog behavior and cancel/save outcome semantics for job result handling

### Requirement: Documentation changes SHALL include drift-prevention guidance

Updated docs MUST include a maintenance checklist that ties helper/runtime contract changes to required documentation updates.

#### Scenario: Future helper addition

- **WHEN** a new helper or hook-facing bridge function is added
- **THEN** checklist requires corresponding documentation update before change completion

### Requirement: Workflow docs SHALL distinguish consumption from production
Current-state developer and user documentation SHALL explain in separate sections that `inputs` defines the execution consumer contract and `validateSelection` defines candidate production, filtering, and cardinality.

#### Scenario: Author reads workflow manifest guidance
- **WHEN** documentation introduces v2 input planning
- **THEN** it does not describe inputs and validation as interchangeable first-stage and advanced filters

### Requirement: Workflow docs SHALL describe v2 semantics completely
Documentation SHALL cover required triggers, member kinds, selector policies, filter phases and order, candidate requirements, deterministic grouping, prepared units, duplicate/queue boundaries, and summary statistics.

#### Scenario: Author configures parent grouping
- **WHEN** documentation shows a parent-grouped attachment workflow
- **THEN** it explains stable parent identity, orphan skipping, member order, and top-level concurrency

### Requirement: Embedded workflow help SHALL be generated
Localized site workflow documentation SHALL be updated from current-state sources and embedded `addon/content/help-docs` output SHALL be produced by the repository generator rather than direct edits.

#### Scenario: Help-doc checks run
- **WHEN** workflow documentation changes are complete
- **THEN** generated help and localization governance checks pass

