## MODIFIED Requirements

### Requirement: Governed references SHALL be comprehensive and directly reachable
Every non-generated instruction file under a governed Skill's `references/` directory SHALL be directly linked from its `SKILL.md`. Generated per-command references MAY instead be directly linked from the generated command catalog when `SKILL.md` directly links that catalog. References SHALL cover coherent decision domains rather than fragmented reminders, and execution-critical constraints SHALL also appear in `SKILL.md`.

#### Scenario: Non-generated orphan reference blocks publication
- **WHEN** a governed non-generated reference is not directly linked from `SKILL.md`
- **THEN** deterministic Host Bridge content validation fails before materialization.

#### Scenario: Generated command card is unreachable
- **WHEN** a generated command card is missing from the directly linked command catalog, linked more than once, or linked by an incorrect path
- **THEN** deterministic Host Bridge content validation fails before materialization.

### Requirement: Minimum command references SHALL be partitioned by canonical leaf command
The Minimum Skill SHALL publish one exhaustive generated Markdown command card for every canonical leaf command. Each command SHALL map to exactly one deterministic path under `references/commands/`, and each card SHALL be independently sufficient to inspect that command's complete argv, invocation, structured-input, payload, result, effect, approval, handle, recovery, target, alias, and intent contract.

#### Scenario: Agent needs one command
- **WHEN** an agent selects a canonical command from the catalog
- **THEN** the catalog links exactly one card for that command
- **AND** the agent does not need to load unrelated commands to inspect the complete contract.

#### Scenario: Command inventory changes
- **WHEN** a canonical leaf command is added, removed, renamed, or remapped
- **THEN** rendering fails until card paths, catalog links, parser inventory, and command-contract registry form one duplicate-free and orphan-free set.

### Requirement: Minimum-core SHALL provide intent-first command discovery
The minimum-core surface SHALL publish a generated command catalog that lets an agent discover canonical commands from Zotero task intent before it knows command names, while keeping detailed invocation contracts in directly linked per-command cards.

#### Scenario: Agent starts from an ordinary Zotero request
- **WHEN** an agent needs to act on a Zotero library but does not know a canonical command
- **THEN** the catalog maps the task family and natural-language cues to candidate commands and the correct individual command card.

#### Scenario: Catalog is rendered from the command contract
- **WHEN** the CLI Agent Surface descriptor changes
- **THEN** every canonical command appears exactly once in the generated catalog
- **AND** every catalog entry links exactly one generated card containing that command only.

## ADDED Requirements

### Requirement: Command-card migration SHALL preserve semantic depth
Replacing aggregate command references with per-command cards SHALL preserve every existing authorized command semantic unit from baseline commit `71da2eb325e946291b901d778b20ceb3c5db368f`. Only the eight declared aggregate container files MAY be removed, and their still-valid command semantics SHALL be mapped into generated cards.

#### Scenario: Command cards are validated against the fixed baseline
- **WHEN** the Minimum package is rendered
- **THEN** validation reports `unmapped = 0`, `downgraded = 0`, `unauthorized dropped = 0`, and `intra-package duplicate = 0`
- **AND** command coverage is `125/125`
- **AND** aggregate-to-card substantive instruction lines are at least 2092
- **AND** normalized prose characters are at least 95 percent of 241086.
