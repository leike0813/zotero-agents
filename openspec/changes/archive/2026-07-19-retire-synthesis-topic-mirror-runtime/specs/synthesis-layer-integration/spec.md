## ADDED Requirements

### Requirement: Workflow Host exposes the Synthesis service

The Workflow Host API SHALL continue to expose Synthesis use cases independently of Topic mirror retirement.

#### Scenario: Host API is created

- **WHEN** workflow host API is created
- **THEN** it SHALL expose a Synthesis service for workflow hooks
- **AND** Topic apply SHALL persist through canonical service state without mirror access.

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Zotero mirror runtime smoke is covered

**Reason**: The runtime adapter and its public surface have no production composition or consumer and conflict with canonical-only persistence.

**Migration**: Keep the Workflow Host service exposure under its own requirement; remove mirror adapter smoke and shard-degradation behavior.

### Requirement: Zotero mirror contains complete current topic state

**Reason**: Canonical files, not Zotero note shards, are the only current Topic state and recovery source.

**Migration**: Existing Zotero items remain untouched. Any future legacy import requires a separately specified one-shot tool.
