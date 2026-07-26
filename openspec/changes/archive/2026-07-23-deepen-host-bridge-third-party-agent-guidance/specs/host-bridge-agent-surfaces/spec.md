## ADDED Requirements

### Requirement: Minimum-core SHALL provide intent-first command discovery
The minimum-core surface SHALL publish a generated command catalog that lets an agent discover canonical commands from Zotero task intent before it knows command names, while keeping detailed invocation contracts in directly linked partition references.

#### Scenario: Agent starts from an ordinary Zotero request
- **WHEN** an agent needs to act on a Zotero library but does not know a canonical command
- **THEN** the catalog maps the task family and natural-language cues to candidate commands and the correct detailed reference

#### Scenario: Catalog is rendered from the command contract
- **WHEN** the CLI agent-surface descriptor changes
- **THEN** every canonical command appears exactly once in the generated catalog and remains covered exactly once by a detailed command partition

### Requirement: Governed instruction depth SHALL be checked on materialized packages
The governed surfaces SHALL enforce hard minimum instruction depths of 100 lines for `SKILL.md` and 200 lines for references, and SHALL emit review warnings below 200 and 350 lines respectively without treating length as semantic completeness.

#### Scenario: Materialized instruction is too short
- **WHEN** a governed materialized `SKILL.md` or reference is below its hard minimum
- **THEN** the package gate fails before publication

#### Scenario: Generated source template is intentionally compact
- **WHEN** a source template expands into a complete materialized catalog or command reference
- **THEN** the depth gate evaluates the materialized instruction rather than failing the template

#### Scenario: Instruction is above the hard minimum but below the advisory depth
- **WHEN** a governed instruction falls into the advisory range
- **THEN** validation emits a warning and semantic review records whether the content is complete or requires expansion

### Requirement: Instruction depth SHALL preserve semantic ownership
Depth validation SHALL require natural-language routing, executable workflow, boundaries, completion, and recovery appropriate to each surface, and SHALL reject package-local substantive prose duplication.

#### Scenario: File reaches the line threshold through repetition
- **WHEN** an instruction repeats substantive prose instead of adding owned semantics
- **THEN** the package or semantic review gate fails
