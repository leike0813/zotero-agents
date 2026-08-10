# zotero-library-agent-bundle Specification

## Purpose
Defines the bounded Generic Zotero research surface, including its coordinator, task Skills, shared result contract, optional deep references, built-in workflow catalog, Minimum inheritance, and standalone publication identity.

## Requirements

### Requirement: Agent-neutral bundle SHALL provide an on-demand Zotero control surface

The repository SHALL generate a `zotero-library-agent-bundle` for general third-party agents that need to inspect a Zotero library or operate Zotero Agents during one bounded task. Its first-level guidance SHALL route stable intents to canonical commands and progressively load command/output/error contracts.

#### Scenario: Agent installs the bundle

- **WHEN** an agent consumes the published bundle
- **THEN** it SHALL receive the `zotero-library-agent` Skill, the `zotero-bridge-cli` wrapper Skill, the Host Bridge profile template, installers, and supported-platform CLI prebuilds
- **AND** it SHALL NOT receive Hermes profile configuration, cron jobs, resident indexes, or background monitoring state.

#### Scenario: Agent handles an on-demand task

- **WHEN** an agent needs current selection, library reads, annotations, files, products, synthesis data, workflows, approved mutations, run interaction, or diagnostics
- **THEN** the Skill SHALL route the task through canonical `zotero-bridge` command families and bounded current-task operations
- **AND** it SHALL identify required evidence, typed handles, approvals, and safe recovery.

### Requirement: Agent-facing surfaces SHALL keep task policy independent

The CLI wrapper, general library agent bundle, and Zotero Librarian profile SHALL maintain independent task-level semantic sources while consuming shared terminology, protocol control invariants, and generated Agent Control Contract references.

#### Scenario: Shared control fact changes

- **WHEN** a Host Bridge handle, approval, workflow ownership, file-transfer, writeback, retry, or state-change invariant changes
- **THEN** all rendered agent-facing surfaces SHALL receive the same shared current-state reference
- **AND** semantic governance SHALL detect stale generated copies.

#### Scenario: Resident maintenance policy changes

- **WHEN** the Zotero Librarian profile changes indexing, scheduling, inbox, monitoring, or maintenance behavior
- **THEN** the general library agent Skill SHALL NOT inherit that policy unless its own bounded task contract is deliberately changed.

### Requirement: Bundle version SHALL track the CLI release line independently
The bundle version SHALL use the recorded Host Bridge CLI major and minor components with a bundle-owned patch component.

#### Scenario: Bundle public content changes
- **WHEN** public Skill guidance, shared control facts, schemas, helpers, generated references, or package layout changes without a CLI major/minor change
- **THEN** the bundle patch SHALL be increased exactly once before rendering and publication.

#### Scenario: CLI patch changes
- **WHEN** only the recorded CLI patch changes
- **THEN** the bundle version SHALL remain unchanged
- **AND** the bundle manifest SHALL record the exact CLI version and binary checksum set it contains.

### Requirement: Bundle SHALL publish as a standalone repository

The release materializer SHALL assemble the generated bundle for `leike0813/zotero-library-agent-bundle` from verified repository inputs and the prepared release set.

#### Scenario: Bundle is materialized

- **WHEN** the release set contains a complete Host Bridge CLI prebuild identity
- **THEN** the repository candidate SHALL contain both Skills, schemas, helpers, installers, profile template, all supported binaries, and a release manifest
- **AND** its manifest SHALL record the shared `releaseSetId`, exact CLI identity, binary aggregate, seven checksums, bundle version, and bundle content digest.

#### Scenario: Bundle identity differs from another surface

- **WHEN** the bundle candidate does not match the CLI identity and release-set envelope used by the CLI bundle and Librarian Profile
- **THEN** unified publication SHALL reject all mutable advancement.

### Requirement: Library Agent guidance SHALL be composed from facts and bounded task semantics

The Zotero Library Agent bundle SHALL generate domain-oriented intent-to-command-to-evidence guidance by composing Agent Surface facts, shared family defaults, and Library-Agent-owned semantic supplements.

#### Scenario: Agent routes a bounded task
- **WHEN** an agent needs connectivity or context, library data, workflow/run control, mutation/file/Product operations, Synthesis data, or diagnostics
- **THEN** the bundle SHALL route the intent to canonical commands and the evidence needed to finish that bounded task
- **AND** it SHALL load detailed command and error contracts only when relevant.

#### Scenario: Agent avoids a misleading command
- **WHEN** two commands have related names but different ownership, freshness, approval, handle, or state-change behavior
- **THEN** the guidance SHALL provide a current-state `avoidWhen` or equivalent negative selection rule.

#### Scenario: Bundle is rendered
- **WHEN** semantic source or command facts change
- **THEN** the generated bundle SHALL be rebuilt through the canonical renderer
- **AND** no generated command table SHALL require independent manual maintenance.

### Requirement: Library Agent repository README SHALL select the bounded surface

The Library Agent release repository README SHALL explain when to choose the bounded on-demand surface, how to verify the bundled CLI identity, where to enter common task journeys, and when resident Librarian behavior is the appropriate alternative.

#### Scenario: User or agent opens the bundle repository
- **WHEN** the repository README is the first document read
- **THEN** it SHALL identify the bundle as the bounded task surface
- **AND** SHALL route connection details to the CLI wrapper and resident indexing, scheduling, and maintenance to the Librarian Profile.

### Requirement: Library Agent SHALL separate workflow and provider preparation
Library Agent guidance SHALL validate workflow input and backend provider profiles independently and SHALL combine them only when invoking workflow submit.

#### Scenario: Agent prepares a host-owned workflow
- **WHEN** an agent selects a workflow and backend
- **THEN** it reads and validates the workflow contract separately from the backend profile contract
- **AND** reuses a validated profile only when the workflow provider requirements are compatible.

### Requirement: Generic bundle SHALL contain one coordinator and five task Skills
The bundle SHALL publish `zotero-library-agent` as the routing and composition Skill plus `zotero-library-query`, `zotero-literature-acquisition`, `zotero-literature-analysis`, `zotero-research-synthesis`, and `zotero-library-curation` as bounded task Skills.

#### Scenario: Single task is routed once
- **WHEN** a request has one bounded research goal
- **THEN** the coordinator selects the matching task Skill without reproducing its complete playbook

#### Scenario: Multi-stage request is composed
- **WHEN** a request spans multiple task domains
- **THEN** the coordinator orders the task Skills, carries verified evidence between stages, and returns one final result

### Requirement: Generic task references SHALL use progressive disclosure
The coordinator and each bounded task Skill SHALL contain a complete executable primary contract in `SKILL.md`. Direct references SHALL expand named complex scenarios and SHALL NOT be a mandatory first workflow step.

#### Scenario: Task has no complex branch
- **WHEN** a request can be completed by the task Skill's primary workflow
- **THEN** the agent completes it without loading the task playbook

#### Scenario: Complex branch is encountered
- **WHEN** the request requires a detailed object model, decision matrix, worked path, or recovery analysis
- **THEN** `SKILL.md` identifies the directly linked comprehensive reference and the applicable section

### Requirement: Generic Skills SHALL share one inline-evidence result contract
All six Generic Skills SHALL use `zotero-library-task.result.v1` with required `schema`, `status`, and `summary`; status SHALL be `completed`, `canceled`, or `failed`; and evidence, artifacts, and diagnostics SHALL be represented in optional structured arrays in the same result.

#### Scenario: Completed result carries evidence inline
- **WHEN** a task completes with source support
- **THEN** its runner result contains structured evidence entries and does not require a second evidence bundle

### Requirement: Generic SHALL include Minimum without duplicating mechanism policy
The materialized Generic surface SHALL contain the complete Minimum component byte-identically. Generic guidance SHALL delegate exact argv, approvals, handles, and recovery details to Minimum.

#### Scenario: CLI contract changes propagate by composition
- **WHEN** Minimum is rebuilt
- **THEN** Generic receives the exact rebuilt Minimum component without regenerating Generic task prose into the CLI descriptor

### Requirement: Generic SHALL own bounded workflow execution policy
The coordinator reference SHALL define Zotero-managed workflow selection and monitoring, self-owned agent handoff execution and apply-receipt recovery, Product/file/artifact evidence, and multi-stage research recovery. Task Skills SHALL apply that cross-task policy without duplicating exact CLI mechanics.

#### Scenario: Hermes delegates a self-owned handoff
- **WHEN** a hosted task selects a workflow whose self-owned mode is supported
- **THEN** the inherited Generic coordinator supplies request inspection, result validation, apply-back, and durable receipt semantics

### Requirement: Generic coordinator SHALL expose official built-in workflows
The coordinator SHALL own one generated catalog of the official non-debug built-in workflows and one separate cross-task research model. The catalog SHALL own inventory and declared invocation inputs; the research model SHALL own cross-task execution, authority, evidence, and recovery policy.

#### Scenario: Catalog and policy remain non-duplicative
- **WHEN** a workflow entry is rendered
- **THEN** its manifest facts appear in the catalog
- **AND** cross-task execution policy remains in the coordinator contract and research model

### Requirement: Generic Skills SHALL translate natural-language research requests
Each Generic Skill SHALL independently define the user utterances it handles, the information it must clarify or may default, the bounded execution path, authority stops, live evidence requirements, and the user-facing completion or recovery response.

#### Scenario: User gives an underspecified research request
- **WHEN** a request omits scope, freshness, evidence depth, deliverable, or requested state change
- **THEN** the selected Skill asks only material questions, discloses safe defaults, and does not cross a write or submission boundary without explicit authority

#### Scenario: User gives a multi-stage request
- **WHEN** one request combines acquisition, analysis, synthesis, or curation
- **THEN** the coordinator presents ordered stages with each stage's owner, input evidence, output evidence, and new authority boundary

### Requirement: Generic references SHALL demonstrate complete task decisions
Each Generic task reference SHALL provide coherent decision guidance and representative end-to-end traces without becoming a prerequisite for the ordinary path or repeating the normative Skill contract.

#### Scenario: Agent encounters a complex branch
- **WHEN** a task has ambiguity, asymmetric evidence, partial completion, or a recoverable failure
- **THEN** the optional playbook shows the path from user utterance through clarification, routing, validation, authority, evidence, result, and user response

### Requirement: Generic results SHALL use one discoverable Runner-validated Schema
All six Generic Skills SHALL return a business payload conforming to `zotero-library-task.result.v1`, SHALL expose the shared Schema in their assets, and SHALL explain its required fields, status meanings, nested evidence, artifact, and diagnostic shapes in the executable Skill contract.

#### Scenario: Agent completes a Generic task
- **WHEN** the Agent emits its final business result
- **THEN** the Runner strips its transport marker and validates the remaining payload against the materialized `assets/output.schema.json`

#### Scenario: Agent needs to construct a result without project context
- **WHEN** an Agent reads only the selected `SKILL.md`
- **THEN** it can construct a minimal valid completed, canceled, or failed result and can discover the full Schema and task-specific examples

#### Scenario: Agent mixes transport and business fields
- **WHEN** the business payload contains `__SKILL_DONE__`, Markdown framing, or unknown fields
- **THEN** the instructions prohibit that shape and runtime Schema validation rejects the invalid business object

### Requirement: Generic SHALL hand confirmed workflow intent to Host-native admission
Generic workflow policy SHALL turn one bounded Zotero-managed objective into one explicit raw-selection submission and SHALL use Host submission state to follow admission before switching to concrete task/run handles.

#### Scenario: Bounded task chooses a Zotero-managed workflow
- **WHEN** live workflow facts, input planning contracts, provider requirements, options, result contract, and authority are confirmed
- **THEN** Generic SHALL submit the reviewed raw selection once with an explicit Host concurrency choice
- **AND** it SHALL retain the returned `submissionId`

#### Scenario: Submission contains pending work
- **WHEN** active submission inspection reports pending units
- **THEN** Generic MAY request interactive pending cancellation when user intent requires it
- **AND** it SHALL NOT claim ownership of FIFO, queue persistence, resident supervision, or CLI mechanism facts

#### Scenario: Concrete tasks appear
- **WHEN** submission inspection or task filtering returns run handles
- **THEN** Generic SHALL use those handles for bounded completion/evidence work or hand continuous supervision to the hosted facet

### Requirement: Generic SHALL expose direct research-bundle delivery as an independent lifecycle branch

The Generic coordinator SHALL distinguish workflow Product delivery, direct paper-bundle delivery, and direct Topic-bundle delivery. Stable direct scopes SHALL enter the Synthesis task without workflow submission; unresolved identities SHALL pass through Query first. Direct delivery SHALL use the shared Generic result contract and SHALL NOT be represented as a Product, Zotero attachment, or persisted Synthesis mutation.

#### Scenario: Local direct delivery completes
- **WHEN** Synthesis verifies the local bundle manifest, scope, file inventory, and warnings
- **THEN** the Generic result records completed local delivery evidence.

#### Scenario: Remote bundle is prepared but not downloaded
- **WHEN** Synthesis has a valid bridge-download descriptor but the caller has not retrieved the bytes
- **THEN** the result distinguishes prepared delivery from completed download
- **AND** it preserves the original typed Handle evidence.

#### Scenario: Remote bundle is downloaded
- **WHEN** the caller retrieves the archive and verifies its declared size and checksum
- **THEN** Generic may report completed downloaded delivery and the unpacked manifest evidence.

### Requirement: Generic direct-delivery recovery SHALL resume from missing evidence

Generic SHALL retain validated identities, warnings, and completed evidence and resume at bundle generation or byte download, whichever is the first unproven node. It SHALL NOT rerun earlier analysis, maintenance, or workflow stages merely because packaging, Handle expiry, or transfer failed.

#### Scenario: Remote Handle expires
- **WHEN** the source scope remains valid but its Handle expires
- **THEN** Synthesis requests a new direct bundle for the same scope and resumes download.

#### Scenario: User requests missing material to be produced
- **WHEN** the user explicitly asks to acquire or generate content missing from a direct bundle
- **THEN** Generic plans that state-changing or model-execution work as a separate authorized stage before a new direct-delivery request.
