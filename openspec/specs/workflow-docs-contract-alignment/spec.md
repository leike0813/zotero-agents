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

### Requirement: Hook runtime documentation SHALL describe the closed v12 boundary

`doc/components/workflow-hook-helpers.md` MUST describe the current
`WorkflowRuntimeContext`, the exact v12 Host projection, and package-local pure
helper ownership without documenting removed runtime injections.

#### Scenario: Workflow author reads runtime documentation

- **WHEN** a workflow author reads the hook runtime reference
- **THEN** the documented runtime fields match `WorkflowRuntimeContext`
- **AND** `runtime.helpers`, `runtime.handlers`, and `runtime.zotero` are absent from the supported surface

### Requirement: Hook-facing editor ownership SHALL be documented

Workflow docs MUST explain hook-facing dialog/editor bridge usage, including ownership boundary and lifecycle semantics.

#### Scenario: Bridge boundary clarity

- **WHEN** docs describe dialog/editor integration
- **THEN** they identify `hostApi.editor.openSession` as the hook entry point and keep renderer registration and global bridge details private

#### Scenario: Multi-input sequencing and cancel semantics

- **WHEN** docs describe editor/dialog behavior for multiple input units
- **THEN** they specify sequential dialog behavior and cancel/save outcome semantics for job result handling

### Requirement: Documentation changes SHALL include drift-prevention guidance

Updated docs MUST include a maintenance checklist that ties runtime/Host
contract changes to required documentation updates.

#### Scenario: Future runtime member change

- **WHEN** a runtime field or Workflow Host member changes
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

### Requirement: Literature search ingest documentation SHALL list its complete parameter contract

The English and every supported localized site document for
`literature-search-ingest` SHALL describe `query`, `searchMode`,
`searchBreadth`, `languageHints`, and `targetCollection`, including their
defaults and user-visible semantics. Embedded help SHALL be regenerated from
those site sources.

#### Scenario: User reads localized workflow help

- **WHEN** a user opens literature-search-ingest documentation in a supported
  locale
- **THEN** the parameter table includes the configured search breadth and
  optional language hints
- **AND** the corresponding embedded help was generated from the localized site
  source

### Requirement: Current Workflow documentation SHALL describe only v12 host behavior

Current Workflow Host, hook helper, Broker ownership, package compatibility,
and execution documentation SHALL describe the exact v12 interface and hard
cut. Historical v11 behavior MAY remain only in archived changes and MUST NOT
appear as current guidance.

#### Scenario: Current documentation is scanned

- **WHEN** documentation governance scans explicit Workflow Host version
  declarations
- **THEN** every active declaration identifies v12 and no current page
  recommends a removed member or fallback

### Requirement: Documentation SHALL preserve owner and projection distinctions

Documentation SHALL state that Broker owns Zotero semantics, Workflow Host owns
trusted in-process composition, runtime persistence owns ordinary filesystem
selection, runtime bridge and picker own their separate seams, platform
subprocess owns one-shot execution, Synthesis sidecar owns durable application
state, and Host Bridge/MCP own remote policy.

#### Scenario: Developer looks up attachment locality

- **WHEN** the docs describe attachment results
- **THEN** they distinguish trusted Workflow local paths from Host Bridge/MCP
  remote locality projection

### Requirement: Generated help SHALL remain source-derived

Embedded help documentation SHALL be regenerated only through its owner pipeline
after current source documentation is updated. Generated help targets MUST NOT
be edited directly during v12 activation.

#### Scenario: Help content needs v12 wording

- **WHEN** a source document changes
- **THEN** the documentation pipeline produces the generated target and drift
  checks verify it
