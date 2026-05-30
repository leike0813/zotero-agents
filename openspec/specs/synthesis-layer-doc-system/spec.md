## Purpose

Define the canonical Synthesis Layer documentation system and prevent future documentation drift.

## ADDED Requirements

### Requirement: Active Synthesis docs SHALL have one compact entry point

`doc/synthesis-layer/README.md` SHALL be the canonical entry point for active Synthesis Layer design docs.

#### Scenario: Developer opens Synthesis docs

- **WHEN** a developer opens `doc/synthesis-layer/README.md`
- **THEN** it lists the active reading order
- **AND** it links to the glossary, domain model, registry/graph, reference resolution, topics/discovery, concepts, runtime/rebuild, performance/scale, state machines, sequences, persistence/files, Workbench UI, and contract YAML files.

### Requirement: Deprecated docs SHALL be preserved outside the active tree

The previous Synthesis documentation tree SHALL be preserved under `doc/deprecated/synthesis-layer-legacy-20260531/`.

#### Scenario: Historical docs are needed

- **WHEN** a developer needs old design context
- **THEN** the deprecated directory contains the previous document tree
- **AND** its README states that it is historical reference only.

### Requirement: Active docs SHALL avoid duplicated canonical definitions

Active Synthesis docs SHALL define each canonical concept in exactly one primary location.

#### Scenario: A term is introduced

- **WHEN** a new Synthesis term is introduced
- **THEN** it is added to `glossary.md`
- **AND** other active docs link to or use that term without redefining it.

#### Scenario: A stable state or event is introduced

- **WHEN** a stable state or event ID is introduced
- **THEN** it is added to `contracts/states-and-events.yaml`
- **AND** at least one Markdown document explains the behavior using that ID.

#### Scenario: A stable sequence ID is introduced

- **WHEN** a stable cross-domain sequence ID is introduced
- **THEN** it is added to `contracts/states-and-events.yaml`
- **AND** `sequences.md` contains a matching section with a Mermaid sequence diagram.

### Requirement: Active docs SHALL match the local Zotero runtime model

Active docs SHALL describe local async coordination for the single-process Zotero plugin runtime.

#### Scenario: Runtime coordination is documented

- **WHEN** active docs describe workers, queues, rebuilds, or recovery
- **THEN** they use short transactions, in-progress markers, startup cleanup, and epoch/basis checks
- **AND** they do not prescribe lease, heartbeat, reaper, dead-letter queue, event sourcing, CQRS, or lock ordering as active design requirements.

### Requirement: Active docs SHALL include state machines and sequences

Active docs SHALL include compact state-machine and sequence contracts without restoring the old engineering document tree.

#### Scenario: Developer checks state-machine IDs

- **WHEN** a developer reads `contracts/states-and-events.yaml`
- **THEN** every `sm.*` ID has a matching section in `state-machines.md`
- **AND** the section defines owner, object, allowed transitions, forbidden transitions, and implementation risk.

#### Scenario: Developer checks sequence IDs

- **WHEN** a developer reads `contracts/states-and-events.yaml`
- **THEN** every `seq.*` ID has a matching section in `sequences.md`
- **AND** the section contains a Mermaid sequence diagram.

#### Scenario: Historical Index naming would be reintroduced

- **WHEN** sequence IDs are added or updated
- **THEN** canonical IDs use Registry Cache terminology
- **AND** they do not use historical `seq.index.*` naming.

### Requirement: Active docs SHALL define stable literature identity semantics

Active docs SHALL state the canonical `paper_ref` format and deterministic `literature_item_id` generation contract.

#### Scenario: A Zotero-bound paper is registered

- **WHEN** a Zotero-bound paper has `paper_ref = <libraryId>:<itemKey>`
- **THEN** active docs define the v1 `literature_item_id` as `lit:` plus the first 24 hex chars of `sha256(hashCanonicalJson({ kind: "zotero-paper", ref: paper_ref }))`
- **AND** URI-like paper references are not the canonical active format.

#### Scenario: Registry rebuild recognizes redirects or external works

- **WHEN** Registry rebuild sees accepted redirects, current Zotero bindings, or strong identifiers for external works
- **THEN** it resolves those identities before allocating any new provisional external ID
- **AND** graph edges, review rows, and durable effects can survive rebuild through deterministic IDs and redirect facts.

### Requirement: Active docs SHALL bound user-facing review queues

Active docs SHALL prevent matching and dedupe from producing unbounded user review queues.

#### Scenario: Weak candidate generation would produce too many review items

- **WHEN** duplicate, external-dedupe, or reference-resolution candidates exceed bounded limits
- **THEN** the system records aggregate diagnostics or debug rows
- **AND** it does not render an unbounded number of user-facing review cards.

### Requirement: Active docs SHALL keep Discovery lightweight by default

Active docs SHALL define the default Discovery baseline as apply-time token/phrase overlap over existing metadata, including enough scoring detail for implementation.

#### Scenario: No embedding provider is configured

- **WHEN** a literature digest artifact is applied
- **THEN** Discovery can run `discovery.apply_time_token_overlap.v1` over topic interest metadata and literature matching metadata
- **AND** it does not require BM25, embedding, semantic search, or an LLM pairwise judge
- **AND** the docs define normalization, field sets, hard rejects, `active_weight_sum`, default `min_open_score`, seed boost, and top-k limits.

#### Scenario: A filtered discovery hint is recomputed

- **WHEN** digest rerun, metadata hash drift, or Registry rebuild recomputes the same topic-literature pair
- **THEN** a filtered hint remains suppressed
- **AND** it is not automatically reopened.

### Requirement: Active docs SHALL preserve topic workflow sidecar boundaries

Active docs SHALL summarize the final manifest sidecar contract instead of losing it during consolidation.

#### Scenario: Topic synthesis apply ingests sidecars

- **WHEN** a topic synthesis result includes `analysis_manifest_path`
- **THEN** host apply treats the manifest `sidecars` object as the canonical sidecar discovery surface
- **AND** topic interest metadata, concept proposals, and topic graph relation proposals are recognized as the required sidecar families.

### Requirement: Active docs SHALL define external source drift fan-out limits

Active docs SHALL prevent startup reconcile from expanding suspicious Zotero/source-artifact drift into unbounded work.

#### Scenario: Startup reconcile detects bulk or structural drift

- **WHEN** drift is classified as bulk or structural
- **THEN** the system records a bounded incident and recommended repair/rebuild action
- **AND** it does not create per-item fan-out for topic work, graph jobs, review cards, or unbounded dirty events.

#### Scenario: Drift is classified

- **WHEN** startup reconcile classifies external source drift
- **THEN** active docs define the numeric small/bulk thresholds and structural triggers.

### Requirement: Active docs SHALL define staged Registry rebuild promotion

Active docs SHALL prevent failed Registry rebuilds from replacing the active Registry basis.

#### Scenario: Registry rebuild fails before validation

- **WHEN** a candidate Registry rebuild fails before promotion
- **THEN** the active `registry_epoch` remains unchanged
- **AND** Workbench reads continue to use the previous committed Registry basis.

#### Scenario: A promoted Registry epoch is later found bad

- **WHEN** the user explicitly rolls back to last-known-good Registry state
- **THEN** the active Registry basis is restored
- **AND** Graph work is requeued on the restored basis.

### Requirement: External references SHALL point to active docs

Project docs and active OpenSpec changes SHALL not point developers to removed active Synthesis doc paths.

#### Scenario: Link scan runs

- **WHEN** links are scanned under `doc` and active `openspec/changes`
- **THEN** there are no active references to removed split-document paths for the old trigger map, topic synthesis content contract, review input contract, or engineering subdirectory.

### Requirement: Active docs SHALL retain executable matcher and runtime policy contracts

Active docs SHALL not compress critical matcher, routing, rebuild, and performance contracts into only high-level prose.

#### Scenario: Reference resolution policy is needed

- **WHEN** a developer changes citation reference matching or external work dedupe
- **THEN** active docs provide matcher tiers, normalization rules, danger pairs, output contract, evaluation metrics, and performance boundaries.

#### Scenario: Runtime routing policy is needed

- **WHEN** a source event must be converted into dirty events, review items, jobs, diagnostics, or supersede commands
- **THEN** active docs provide `SynthesisRoutingInput`, `SynthesisRoutingResult`, and a source-to-effect routing table.

#### Scenario: Rebuild behavior is reviewed

- **WHEN** a rebuild/reset/import operation is changed
- **THEN** active docs provide a rebuild operation matrix covering trigger, confirmation, old work handling, epoch/basis behavior, downstream impact, and progress.

#### Scenario: Performance risk is reviewed

- **WHEN** a UI read path or worker is changed
- **THEN** active docs provide scale tiers, p95 read targets, worker budgets, SQLite transaction guidance, pagination, and diagnostics boundaries.

### Requirement: Active docs SHALL define Concept KB ownership and integration

Active docs SHALL include a dedicated Concept KB document when Topics and Concepts are contractually coupled.

#### Scenario: Topic synthesis emits concept proposals

- **WHEN** topic apply produces `concept_card_proposal` or `topic_concept_link_proposal`
- **THEN** active docs define Concept proposal ingestion, validation, review mapping, failure behavior, and the fact that Topic artifacts are not rolled back by default.

#### Scenario: Topic UI or workflow reads concept overlay

- **WHEN** Topics request `concept_overlay_context`
- **THEN** active docs define bounded overlay query patterns and non-blocking failure semantics.

### Requirement: Active docs SHALL define critical runtime edge cases

Active docs SHALL document safety gates and feedback-loop prevention for high-risk runtime flows.

#### Scenario: Registry candidate is validated

- **WHEN** Registry rebuild reaches validating
- **THEN** active docs define required validation checks, suspicious count handling, timeout behavior, advanced bypass, and last-known-good rollback protection.

#### Scenario: Discovery metadata is concurrently updated

- **WHEN** digest apply discovery runs while topic metadata changes
- **THEN** active docs define committed-snapshot semantics and fallback metadata labeling.

#### Scenario: Related-items sync writes Zotero relations

- **WHEN** Zotero emits a change event caused by related-items sync
- **THEN** active docs require echo detection so the event does not re-enter Registry reindex or enqueue another sync loop.

#### Scenario: Topic source-check diagnostic is no longer relevant

- **WHEN** a topic is deleted or its artifact baseline is replaced
- **THEN** active state-machine contracts include terminal cleanup transitions for old source-check diagnostics.
