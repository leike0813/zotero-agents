## MODIFIED Requirements

### Requirement: Redesigned guidance SHALL be a semantic superset
The governed guidance SHALL preserve every unique execution-relevant semantic unit from the pinned clean baseline, including goals, decisions, procedures, constraints, evidence, completion, failures, recovery, examples, and near misses. Except for semantic units explicitly authorized for deletion by the active change, baseline instructions SHALL NOT be compressed, deleted, merged, stylistically rewritten, or weakened into summaries. Replaced implementation entities SHALL map to an equivalent current capability at comparable procedural depth.

#### Scenario: Baseline meaning has no destination
- **WHEN** semantic review finds an unmapped, downgraded, or unauthorized dropped baseline unit
- **THEN** the review is blocked before governed content is rendered

#### Scenario: Active change removes an obsolete owner
- **WHEN** the change intentionally removes a baseline mechanism
- **THEN** the parity matrix SHALL name each exact removable semantic unit, its authorization, and its replacement owner or reason for no replacement
- **AND** adjacent authority, evidence, completion, and recovery semantics SHALL remain mapped

### Requirement: Governed instruction depth SHALL be checked on materialized packages
The governed surfaces SHALL enforce hard minimum instruction depths of 100 lines for `SKILL.md` and 200 lines for references, and SHALL emit review warnings below 200 and 350 lines respectively without treating length as semantic completeness. When an active change pins a materialized baseline, every same-path affected instruction SHALL also meet the declared relative line and prose-depth floors.

#### Scenario: Materialized instruction is too short
- **WHEN** a governed materialized `SKILL.md` or reference is below its absolute or pinned relative minimum
- **THEN** the package gate fails before publication

#### Scenario: Generated source template is intentionally compact
- **WHEN** a source template expands into a complete materialized catalog or command reference
- **THEN** the depth gate evaluates the materialized instruction rather than failing the template

#### Scenario: Instruction is above the hard minimum but below the advisory depth
- **WHEN** a governed instruction falls into the advisory range
- **THEN** validation emits a warning and semantic review records whether the content is complete or requires expansion

### Requirement: Instruction depth SHALL preserve semantic ownership
Depth validation SHALL require natural-language routing, executable workflow, boundaries, completion, and recovery appropriate to each surface, and SHALL reject package-local substantive prose duplication. Relative depth success SHALL NOT override semantic-parity failures.

#### Scenario: File reaches the line threshold through repetition
- **WHEN** an instruction repeats substantive prose instead of adding owned semantics
- **THEN** the package or semantic review gate fails

#### Scenario: File remains long but loses a constraint
- **WHEN** an affected file meets line and prose thresholds but loses or weakens a baseline semantic unit
- **THEN** the semantic review remains blocked
