# synthesis-layer-integration Specification

## Purpose
TBD - created by archiving change harden-synthesis-layer-v1-integration. Update Purpose after archive.

## Requirements
### Requirement: Paper artifact completeness has one four-artifact source of truth

Registry completeness, artifact reads and exports, Topic material readiness, freshness snapshots, and Index artifact state SHALL use `digest`, `references`, `citation_analysis`, and `literature_score` as one shared set.

#### Scenario: Only literature score is missing
- **WHEN** digest, references, and citation analysis are available but literature score is missing
- **THEN** artifact coverage SHALL be `partial`
- **AND** the reference facet SHALL remain determined only by references and citation analysis.

#### Scenario: Literature score is invalid
- **WHEN** a score payload cannot be decoded or fails `literature_score.v1` validation
- **THEN** its artifact status SHALL be `error`
- **AND** it SHALL be unavailable for completeness.

### Requirement: Literature quality projection is shared

Research workflows SHALL consume one compact validated quality snapshot and one confidence-weighted quality prior.

#### Scenario: Valid score is projected
- **WHEN** a valid `literature_score.v1` payload is read
- **THEN** the snapshot SHALL include schema, rubric, paper type, score, confidence, confidence-adjusted score, quality prior, and payload hash.

#### Scenario: Score is missing or invalid
- **WHEN** a score is missing or invalid
- **THEN** quality prior SHALL be `0.5`
- **AND** a stable missing or invalid diagnostic SHALL be recorded.

### Requirement: Topic synthesis results persist through a plugin-side service


Applying a topic synthesis result SHALL persist structured topic content as the canonical current artifact and Markdown as a compatibility export.

#### Scenario: Structured topic result is applied

- **WHEN** applyResult receives a valid create or full-update bundle with a complete section manifest
- **THEN** the Synthesis service SHALL assemble and validate the complete structured artifact
- **AND** it SHALL persist `current/manifest.json`, `current/sections/*.json`, `current/artifact.json`, `current/metadata.json`, and `current/export.md` under the topic canonical directory
- **AND** it SHALL record structured and Markdown hashes in metadata
- **AND** it SHALL NOT access Zotero Topic mirror state.

#### Scenario: Section patch is applied

- **WHEN** applyResult receives a valid `update_patch` bundle
- **THEN** the Synthesis service SHALL load the current manifest and section files
- **AND** it SHALL verify `read_section_hashes` against the current manifest
- **AND** it SHALL reject the patch if any read section hash no longer matches
- **AND** it SHALL replace only the changed sections named by the patch
- **AND** it SHALL inherit unchanged sections from current
- **AND** it SHALL validate the full materialized artifact before replacing the canonical current artifact
- **AND** it SHALL render `current/export.md` from the materialized artifact
- **AND** it SHALL not persist a patch-only artifact as current.

#### Scenario: Non-overlapping section patch is applied after unrelated change

- **WHEN** the current artifact hash differs from the patch diagnostic base hash
- **AND** every section listed in `read_section_hashes` still matches current
- **THEN** applyResult SHALL allow the patch to proceed
- **AND** it SHALL preserve unrelated current sections.

#### Scenario: Section patch changes language or resolver state

- **WHEN** an `update_patch` bundle attempts to change language, topic definition, topic resolver, or resolved paper set
- **THEN** applyResult SHALL reject the patch and require `update_full`.

#### Scenario: Old topic directory is detected

- **WHEN** a topic directory only contains the old `current.md` and `current.json` files
- **THEN** the service SHALL mark the topic as `legacy_invalid` or `needs_recreate`
- **AND** it SHALL NOT treat old `current.md` as the v2 display source of truth
- **AND** it SHALL NOT interpret old `current.json` as v2 metadata.

#### Scenario: Topic row is projected

- **WHEN** the Synthesis service builds a topic row for the Workbench snapshot
- **THEN** the row SHALL prefer structured summary, paper count, external literature count, language, source-material status, and source-material percent fields over Markdown-derived preview text.

#### Scenario: Update intent is projected

- **WHEN** the Synthesis service builds a topic row for a stale, incomplete, or dirty topic
- **THEN** it SHALL derive a host-owned update intent from freshness, source-material readiness, stale reasons, and dirty reasons
- **AND** the intent SHALL include prefillable topic id, language, update scope, update mode, update reason, action label, and whether update is allowed or should be treated as repair/rebuild.

#### Scenario: Update context is requested

- **WHEN** an update synthesis job requests topic context
- **THEN** the Synthesis service SHALL return current artifact context, metadata, resolver, resolved paper set, freshness state, base hashes, and a recommended update derived from the topic state
- **AND** the workflow submit dialog SHALL NOT need to carry full stale reason details or old artifact content as user-editable parameters.

#### Scenario: Paper digest is resolved for Topic Detail

- **WHEN** the Workbench requests a paper digest for a structured topic paper evidence entry
- **THEN** the host SHALL resolve the original `digest-markdown` payload through the stored `digest_ref`
- **AND** it SHALL return the digest Markdown and current source hash when the payload is available
- **AND** it SHALL report a source-changed state when the current hash differs from the hash recorded in the topic artifact.

#### Scenario: Paper digest cannot be resolved

- **WHEN** the stored `digest_ref` no longer resolves to a readable digest
- **THEN** the host SHALL return a bounded unavailable/error DTO
- **AND** it SHALL NOT fail the entire structured topic artifact read.

### Requirement: Workflow hooks delegate formal persistence to hostApi


The builtin topic synthesis workflow hook SHALL delegate formal persistence to
`runtime.hostApi.synthesis.applyTopicSynthesisResult`.

#### Scenario: Host synthesis service is available

- **WHEN** applyResult receives a result bundle and host synthesis service exists
- **THEN** the hook SHALL call the host service
- **AND** it SHALL return the host service result.

#### Scenario: Host synthesis service is unavailable

- **WHEN** applyResult receives a result bundle without host synthesis service
- **THEN** the hook SHALL fail explicitly instead of pretending the result was
  persisted.

### Requirement: Synthesis reads use persisted service state


MCP, UI, and review workflow input SHALL read topic synthesis data from the same persisted service state.

#### Scenario: UI snapshot is requested after apply

- **WHEN** a topic synthesis bundle has been persisted
- **THEN** the UI snapshot SHALL include the persisted topic artifact row
- **AND** it SHALL expose canonical storage, conflict, registry, and graph state from the service
- **AND** it SHALL NOT synthesize anchor or mirror status fields.

#### Scenario: Review input is requested after apply

- **WHEN** a topic synthesis bundle has been persisted
- **THEN** review input SHALL include the persisted topic Markdown, resolver, resolved paper set, registry artifact coverage, and citation graph slice.

### Requirement: Topic synthesis artifacts support soft delete and purge


The Synthesis service SHALL support soft deletion of active topic synthesis artifacts and physical purge of previously deleted topic artifacts.

#### Scenario: User soft deletes a topic artifact

- **WHEN** an active topic artifact is deleted
- **THEN** the service SHALL remove it from the active artifact index
- **AND** it SHALL preserve the deleted artifact in a deleted-artifact store
- **AND** it SHALL mark or remove active topic definition, resolver, and resolved paper set state so the topic is not returned by default inventory calls
- **AND** it SHALL NOT mutate Zotero anchor or shard items.

#### Scenario: User purges deleted topic artifacts

- **WHEN** deleted topic artifacts are purged
- **THEN** the service SHALL physically remove only deleted-artifact store assets
- **AND** it SHALL NOT remove active topic artifacts, registry projections, citation graph projections, ACP run workspaces, or Zotero items.

### Requirement: Topic synthesis freshness is deterministically tracked


The Synthesis service SHALL persist and update topic synthesis freshness from plugin-owned deterministic dependency snapshots.

#### Scenario: Fresh baseline is written after apply

- **WHEN** a topic synthesis result is applied successfully
- **THEN** the service SHALL write an artifact-state entry for that topic
- **AND** the entry SHALL contain baseline and current dependency hashes
- **AND** the topic SHALL be reported as `fresh`
- **AND** source artifact readiness SHALL be reported through `source_materials_status`, not by turning the topic stale.

#### Scenario: Legacy source-readiness state is migrated

- **GIVEN** a persisted topic artifact-state row contains legacy `coverage` for source readiness and does not contain `source_materials_status`
- **WHEN** the service reads or migrates artifact state
- **THEN** it SHALL map the legacy value to `source_materials_status`
- **AND** subsequent writes SHALL persist only `source_materials_status`
- **AND** they SHALL NOT write topic-row `coverage` or `completion` fields for source readiness.

#### Scenario: Legacy topic initializes baseline on first scan

- **GIVEN** an active topic has no artifact-state entry
- **WHEN** freshness is scanned and required canonical state is readable
- **THEN** the service SHALL initialize the baseline from the current dependency snapshot
- **AND** it SHALL log `baseline_initialized`
- **AND** it SHALL NOT mark the topic stale only because the baseline was missing.

#### Scenario: Topic becomes stale after dependency changes

- **WHEN** the current resolver result, resolved paper artifacts, artifact availability, or persisted graph hash differs from the baseline
- **THEN** the service SHALL mark the topic `stale`
- **AND** it SHALL record machine-readable stale reasons.

#### Scenario: Topic becomes dirty after canonical state cannot be trusted

- **WHEN** required topic files, resolver state, resolved paper set state, or index hashes are missing or inconsistent
- **THEN** the service SHALL mark the topic `dirty`
- **AND** it SHALL record dirty reasons without rewriting the topic Markdown.

### Requirement: Apply decision uses operation-appropriate optimistic checks


Workflow apply decisions SHALL use bundle-level base-hash checks for create and full-update operations, and section read-set checks for update-patch operations.

#### Scenario: Create or full update conflicts with current state

- **WHEN** a create or `update_full` bundle is applied
- **AND** current hashes differ from bundle `base_hashes`
- **THEN** apply decision SHALL be `conflict`
- **AND** it SHALL preserve the candidate without replacing the current structured artifact or Markdown export.

#### Scenario: Patch read set conflicts with current state

- **WHEN** an `update_patch` bundle is applied
- **AND** any section listed in `read_section_hashes` no longer matches current
- **THEN** apply decision SHALL be `conflict`
- **AND** it SHALL preserve the candidate without replacing current sections or Markdown export.

#### Scenario: Patch artifact hash drift does not conflict by itself

- **WHEN** an `update_patch` bundle is applied
- **AND** the current artifact hash differs from the patch diagnostic `current_artifact_hash`
- **AND** every section listed in `read_section_hashes` still matches current
- **THEN** applyResult SHALL NOT reject the patch solely due to full artifact hash drift.

### Requirement: Topic synthesis apply stores current artifacts


The synthesis layer SHALL persist topic synthesis structured artifacts without a
separate compatibility Markdown export.

#### Scenario: Topic detail DTO exposes report body, not markdown export

- **WHEN** a persisted topic detail is read
- **THEN** the DTO SHALL expose the structured sections including
  `synthesis_report`
- **AND** it SHALL NOT expose `markdown_export`
- **AND** it SHALL NOT expose markdown/export hashes.

### Requirement: Topic context audit exposes update preflight inputs

The `topics.get_context` audit view SHALL expose the current topic resolver and compact source paper triage records needed by topic synthesis update preflight.

#### Scenario: Audit view is requested for an existing topic

- **WHEN** `topics.get_context` is called with `view: "audit"`
- **THEN** the response SHALL include audit fields for `topic_resolver` and `source_paper_triage`
- **AND** SHALL NOT inline the full synthesis report body.

### Requirement: Topic artifact engine failures SHALL preserve canonical state

Topic apply SHALL not promote any current files or downstream durable effects
unless all required engine operations complete and their results pass strict
rebuilding.

#### Scenario: Engine fails before promotion

- **WHEN** the configured engine throws, is cancelled, exceeds bounds, or returns malformed output
- **THEN** apply SHALL fail before current files, state maps, topic index, Concept KB, Topic Graph, Discovery, event success, or autosync are updated.

#### Scenario: Patch conflict is returned

- **WHEN** engine section-patch computation returns a read-set conflict
- **THEN** apply SHALL preserve the existing `patch_conflict` response and canonical state.

### Requirement: Workflow Host exposes the Synthesis service


The Workflow Host API SHALL continue to expose Synthesis use cases independently of Topic mirror retirement.

#### Scenario: Host API is created

- **WHEN** workflow host API is created
- **THEN** it SHALL expose a Synthesis service for workflow hooks
- **AND** Topic apply SHALL persist through canonical service state without mirror access.

### Requirement: Workflow Synthesis projection SHALL use four closed groups
The Workflow Synthesis projection SHALL expose exactly `workflowApply`, `topics`, `artifacts`, and `tags` groups. It SHALL contain fourteen callable members and MUST NOT expose flat compatibility aliases, a complete Synthesis client, native RPC methods, repository records, or transport controls.

#### Scenario: Grouped projection is inspected
- **WHEN** recursive contract conformance examines the Synthesis module
- **THEN** it finds the three `workflowApply` members, one `topics` member, one `artifacts` member, and nine `tags` members declared by the v12 manifest

### Requirement: Workflow apply contracts SHALL be canonical across languages
Literature digest apply, Topic plan apply, and Topic synthesis-result apply requests and results SHALL have one canonical declaration shared by Workflow projection, TypeScript client, and Rust application. Adapters MUST preserve the same discriminants and terminal semantics.

#### Scenario: Topic plan is applied
- **WHEN** a workflow submits a valid Topic plan with current optimistic basis
- **THEN** the Rust application returns the canonical apply result through the grouped Workflow adapter without a flat alias

#### Scenario: Topic plan persistence commits
- **WHEN** Topic-plan reconciliation atomically persists a new graph
- **THEN** the result is `persisted` and carries a canonical transaction receipt binding an opaque transaction identity, `topic_plan.reconcile`, the before and after graph hashes, and commit time

#### Scenario: Topic plan does not persist
- **WHEN** Topic-plan reconciliation returns `no_change`, `already_applied`, or `conflict`
- **THEN** the result receipt is `null`

#### Scenario: Topic relation would create a cycle
- **WHEN** a valid Topic plan proposes a broader relation that would create a graph cycle
- **THEN** the result reports the closed `relation_cycle` diagnostic rather than misclassifying the endpoints or throwing a repository error

### Requirement: Synthesis durable ownership SHALL remain native
Synthesis application state, repository transactions, CAS, staging, leases, fencing, cleanup, and internal operation telemetry SHALL remain in the Rust sidecar and its canonical contracts. Workflow callbacks and DTOs MUST NOT expose these mechanisms.

#### Scenario: Sidecar performs a durable promotion
- **WHEN** a grouped Workflow call requires durable Synthesis state change
- **THEN** the native application owns the transaction and the Workflow receives only the declared result DTO

### Requirement: Large canonical operations SHALL preserve their public limits
Topic-plan apply, tag-audit append, and regulator-vocabulary export SHALL use the existing transfer plane whenever their canonical payload exceeds the control-RPC envelope. Adapters MUST NOT silently reduce the 64 MiB, 8 MiB, or 16 MiB public limits.

#### Scenario: Valid Topic plan exceeds the control envelope
- **WHEN** a valid Topic plan is larger than the control-RPC limit but remains within its canonical public limits
- **THEN** composition transfers it through the bounded transfer plane and preserves the same typed result
