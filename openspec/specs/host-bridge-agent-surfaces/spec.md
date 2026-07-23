# host-bridge-agent-surfaces Specification

## Purpose
Defines the three-layer agent-facing surface model (Minimum, Generic, Hermes) for the Zotero Bridge ecosystem, including ownership hierarchy, inheritance, Skill contracts, reference governance, semantic baselines, rendering rules, and task-language requirements.

## Requirements

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

### Requirement: Minimum command references SHALL be partitioned by operational surface
The Minimum Skill SHALL publish exhaustive generated command cards in disjoint references selected by canonical command root. Primary library, mutation, workflow, run, and synthesis roots SHALL each have one reference; supporting connection/context, file/Product/operation, and diagnostic roots MAY be coherently grouped.

#### Scenario: Agent needs one command
- **WHEN** an agent selects a canonical command
- **THEN** `SKILL.md` identifies exactly one directly linked reference containing that command
- **AND** the agent does not need to load unrelated command roots

#### Scenario: Command catalog changes
- **WHEN** a new canonical command root is added
- **THEN** rendering fails until the root has exactly one declared partition

### Requirement: Generic references SHALL provide optional execution depth
Every Generic Skill SHALL begin and complete its primary workflow from `SKILL.md` alone. A reference SHALL be loaded only when a named complex branch, detailed decision table, worked path, or recovery case is relevant.

#### Scenario: Simple task starts directly
- **WHEN** an agent loads a Generic task Skill for a bounded ordinary request
- **THEN** the first workflow action operates on the request rather than requiring a reference read

### Requirement: Generic SHALL publish a built-in workflow selection catalog
The Generic coordinator SHALL directly link a generated catalog of official built-in workflows whose manifests are not marked `debug_only`. The catalog SHALL expose each workflow's purpose, declared invocation inputs, provider requirements, execution modes, selection facts, parameters, and result evidence while identifying live workflow description as runtime authority.

#### Scenario: Agent selects a likely built-in workflow
- **WHEN** a bounded research task may match a built-in workflow
- **THEN** the agent can inspect the optional catalog before performing live list, describe, validation, and submission

#### Scenario: Debug workflow is shipped
- **WHEN** an official workflow manifest declares `debug_only: true`
- **THEN** it is absent from the Generic catalog

### Requirement: Runtime and rendered workflow facts SHALL share one projection
Provider compatibility, required workflow options, execution modes, selection facts, and result evidence exposed by the generated catalog SHALL be derived from the same pure manifest projection used by runtime workflow description.

#### Scenario: Workflow manifest changes
- **WHEN** a catalog-relevant manifest field changes
- **THEN** runtime description and rendered catalog expose the same static contract after rendering

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

### Requirement: Generic task references SHALL use progressive disclosure
The coordinator and each bounded task Skill SHALL contain a complete executable primary contract in `SKILL.md`. Direct references SHALL expand named complex scenarios and SHALL NOT be a mandatory first workflow step.

#### Scenario: Task has no complex branch
- **WHEN** a request can be completed by the task Skill's primary workflow
- **THEN** the agent completes it without loading the task playbook

#### Scenario: Complex branch is encountered
- **WHEN** the request requires a detailed object model, decision matrix, worked path, or recovery analysis
- **THEN** `SKILL.md` identifies the directly linked comprehensive reference and the applicable section

### Requirement: Generic coordinator SHALL expose official built-in workflows
The coordinator SHALL own one generated catalog of the official non-debug built-in workflows and one separate cross-task research model. The catalog SHALL own inventory and declared invocation inputs; the research model SHALL own cross-task execution, authority, evidence, and recovery policy.

#### Scenario: Catalog and policy remain non-duplicative
- **WHEN** a workflow entry is rendered
- **THEN** its manifest facts appear in the catalog
- **AND** cross-task execution policy remains in the coordinator contract and research model

### Requirement: Agent-facing prose SHALL use Zotero task language
Skill descriptions and human-readable guidance across the three surfaces SHALL describe Zotero library needs, research tasks, Zotero-side authority, Zotero-managed state, or the public `zotero-bridge` command. They SHALL NOT require knowledge of the project's internal `Host Bridge` name. Formal protocol, schema, route, environment-variable, command, and code identifiers SHALL remain stable.

#### Scenario: Skill discovery starts from user intent
- **WHEN** an agent decides whether to load a governed Skill
- **THEN** the description identifies the Zotero library task and invocation condition without using `Host Bridge` as the trigger concept

#### Scenario: Machine contracts retain their identity
- **WHEN** the language gate checks a schema ID, protocol ID, route, environment variable, command ID, or code identifier
- **THEN** the formal identifier remains allowed and unchanged

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
