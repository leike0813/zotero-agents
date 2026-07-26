## ADDED Requirements

### Requirement: Agent-facing surfaces SHALL form a declared ownership hierarchy
The system SHALL publish a Minimum surface that owns CLI mechanism facts, a Generic surface that owns bounded research-task policy, and hosted facets that own resident automation policy. Generic SHALL extend Minimum, and the Hermes facet SHALL extend Generic without redefining lower-layer policy.

#### Scenario: Layer ownership is inspectable
- **WHEN** a maintainer inspects the canonical surface definition
- **THEN** each published component has exactly one owning layer and each extension edge is explicit

### Requirement: Surface inheritance SHALL preserve component bytes
The renderer SHALL mount inherited Skills and assets byte-identically and SHALL reject cycles, duplicate component identities, and conflicting mount paths.

#### Scenario: Hermes contains Generic
- **WHEN** the Hermes surface is materialized
- **THEN** its Minimum and Generic component digests equal the corresponding standalone surface component digests

### Requirement: Published Skills SHALL provide minimum-complete contracts
Every Skill governed by the three surfaces SHALL contain a concise frontmatter description stating its capability and invocation condition, and its `SKILL.md` SHALL contain the goal, inputs, executable workflow, hard constraints, completion contract, failure handling, and direct reference-loading guidance required to execute the Skill.

#### Scenario: Skill can start without a reference
- **WHEN** an agent loads only a governed `SKILL.md`
- **THEN** it can identify the first action, mandatory constraints, completion condition, and failure path

### Requirement: Governed references SHALL be comprehensive and directly reachable
Every instruction file under a governed Skill's `references/` directory SHALL be directly linked from its `SKILL.md`. References SHALL cover coherent decision domains rather than fragmented reminders, and execution-critical constraints SHALL also appear in `SKILL.md`.

#### Scenario: Orphan reference blocks publication
- **WHEN** a governed reference is not directly linked from `SKILL.md`
- **THEN** deterministic Host Bridge content validation fails before materialization

### Requirement: Redesigned guidance SHALL be a semantic superset
The governed guidance SHALL preserve every unique execution-relevant semantic unit from the pinned clean baseline, including goals, decisions, procedures, constraints, evidence, completion, failures, recovery, examples, and near misses. Replaced implementation entities SHALL map to an equivalent current capability rather than justify silent removal.

#### Scenario: Baseline meaning has no destination
- **WHEN** semantic review finds an unmapped or downgraded baseline unit
- **THEN** the review is blocked before governed content is rendered

### Requirement: Skill packages SHALL have one owner per meaning
Within one Skill package, `SKILL.md` SHALL own executable workflow and hard constraints, while references SHALL add deeper decision branches, examples, and recovery without repeating the same normative meaning. Exact substantive prose duplication SHALL fail deterministic validation; paraphrased duplication SHALL fail semantic review.

#### Scenario: Reference repeats the main contract
- **WHEN** a reference restates a substantive `SKILL.md` instruction instead of extending it
- **THEN** publication remains blocked until the content is merged or assigned one owner

### Requirement: Surface rendering SHALL be source-to-target only
Semantic sources and templates SHALL live outside generated roots. Renderers SHALL NOT read a governed generated target as the template for rewriting that target.

#### Scenario: Generated roots are reproducible
- **WHEN** governed targets are removed and rendered from a clean checkout
- **THEN** the renderer recreates the same normalized content without reading prior target bytes

### Requirement: Agent-facing prose SHALL use Zotero task language
Skill descriptions and human-readable guidance across the three surfaces SHALL describe Zotero library needs, research tasks, Zotero-side authority, Zotero-managed state, or the public `zotero-bridge` command. They SHALL NOT require knowledge of the project's internal `Host Bridge` name. Formal protocol, schema, route, environment-variable, command, and code identifiers SHALL remain stable.

#### Scenario: Skill discovery starts from user intent
- **WHEN** an agent decides whether to load a governed Skill
- **THEN** the description identifies the Zotero library task and invocation condition without using `Host Bridge` as the trigger concept

#### Scenario: Machine contracts retain their identity
- **WHEN** the language gate checks a schema ID, protocol ID, route, environment variable, command ID, or code identifier
- **THEN** the formal identifier remains allowed and unchanged
