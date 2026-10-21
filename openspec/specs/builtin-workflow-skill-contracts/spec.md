# builtin-workflow-skill-contracts Specification

## Purpose

Keep builtin workflow-produced Skill inputs and parameters executable through the ACP-compatible boundary, with coverage of real request producers rather than manually reconstructed request examples.

## Requirements

### Requirement: Builtin Skill requests conform to their declared contracts
Builtin workflow requests SHALL pass their target Skill input and parameter schemas after workflow defaults, hook projection, sequence inheritance and handoff have been applied. A nonempty namespace SHALL have a corresponding schema.

#### Scenario: Planned Topic request reaches every synthesis step
- **WHEN** Create Topic Synthesis selects a Planned Topic without an ad-hoc seed
- **THEN** preparation, core enrichment and finalization accept its inherited parameters
- **AND** a missing or empty active Planned Topic identifier is rejected.

#### Scenario: Ad-hoc entry preserves inactive form values
- **WHEN** Create Topic Synthesis selects ad-hoc mode or omits the mode
- **THEN** a nonempty seed is required
- **AND** an empty inactive Planned Topic identifier is accepted
- **AND** unknown parameters and incorrectly typed mode values are rejected.

#### Scenario: Tag Bootstrapper validates its language intent
- **WHEN** Tag Bootstrapper receives a tag-note language parameter
- **THEN** it accepts a string and rejects a non-string
- **AND** omission retains the existing default-language behavior.

### Requirement: Builtin form requiredness agrees with Skill admission
Builtin forms SHALL require user-supplied values that their target Skill requires, respecting the selected entry mode.

#### Scenario: Required manuscript context is absent
- **WHEN** a research-bundle submission lacks its title or research content, or a manuscript-framing submission lacks its title
- **THEN** submission validation reports the missing field before provider dispatch.

### Requirement: Producer evidence distinguishes executable and unused boundaries
Builtin producer coverage SHALL derive its workflow denominator from production package declarations and execute real request producers and sequence steps. Missing scenarios or schemas for nonempty namespaces SHALL remain uncovered. Non-Skill workflows and unused namespaces SHALL be reported separately from validated boundaries.

#### Scenario: Conditional requests change their concrete steps
- **WHEN** tagging, translation reuse, metadata preflight or a debug conditional step changes the produced request
- **THEN** each applicable branch is exercised through the actual producer and every dispatched Skill request is validated.

#### Scenario: A new builtin workflow is registered
- **WHEN** a package adds a Skill-producing workflow without an executable contract scenario
- **THEN** the contract suite fails rather than silently omitting that producer.

### Requirement: Schema rejection identifies the offending field
Schema diagnostics SHALL preserve the instance path and the additional or missing property name without including submitted values.

#### Scenario: An unexpected parameter is rejected
- **WHEN** a strict parameter schema rejects an extra property
- **THEN** diagnostics name that property and its location instead of emitting indistinguishable root-only errors.

### Requirement: Skill runtimes SHALL execute their declared structural contracts
Topic Synthesis and Literature Deep Reading runtimes SHALL validate submitted payloads against the complete declared JSON Schema before coercion or domain processing. Domain-specific reference and stage checks SHALL remain in addition to structural validation.

#### Scenario: A union or scalar is invalid
- **WHEN** submitted data violates a declared union, scalar type, enum, required field or closed-object boundary
- **THEN** runtime validation rejects the payload and identifies the offending location.

### Requirement: Generated builtin Skill delivery SHALL require isolated freshness checks
Plugin builds, content packaging and existing CI gates SHALL reject stale generated builtin Skill packages. Checks SHALL render from current sources into isolated outputs, compare all delivered files and leave source and delivery files unchanged.

#### Scenario: Generated output differs
- **WHEN** a renderer source changes without updating its delivered package
- **THEN** build and content packaging fail before packaging with the differing paths.

#### Scenario: Deep Reading graph assets are checked
- **WHEN** freshness validation renders Deep Reading assets
- **THEN** graph templates and Skill outputs are generated only in temporary locations.
