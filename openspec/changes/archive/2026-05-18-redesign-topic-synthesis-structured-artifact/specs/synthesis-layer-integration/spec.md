# synthesis-layer-integration Delta

## MODIFIED Requirements

### Requirement: Topic synthesis results persist through a plugin-side service

Applying a topic synthesis result SHALL persist structured topic content as the
canonical current artifact and Markdown as a compatibility export.

#### Scenario: Structured topic result is applied

- **WHEN** applyResult receives a valid create or full-update bundle with a
  complete section manifest
- **THEN** the Synthesis service SHALL assemble and validate the complete
  structured artifact
- **AND** it SHALL persist `current/manifest.json`,
  `current/sections/*.json`, `current/artifact.json`,
  `current/metadata.json`, and `current/export.md` under the topic canonical
  directory
- **AND** it SHALL record structured and Markdown hashes in metadata.
- **AND** after canonical persistence succeeds, it SHALL attempt to refresh the
  Zotero mirror from canonical current assets.

#### Scenario: Mirror refresh fails after canonical persistence

- **WHEN** canonical structured artifact persistence succeeds
- **AND** Zotero mirror refresh fails
- **THEN** the service SHALL keep the canonical persistence result
- **AND** it SHALL return or log a mirror warning/diagnostic
- **AND** it SHALL NOT report that canonical persistence was rolled back.

#### Scenario: Section patch is applied

- **WHEN** applyResult receives a valid `update_patch` bundle
- **THEN** the Synthesis service SHALL load the current manifest and section
  files
- **AND** it SHALL verify `read_section_hashes` against the current manifest
- **AND** it SHALL reject the patch if any read section hash no longer matches
- **AND** it SHALL replace only the changed sections named by the patch
- **AND** it SHALL inherit unchanged sections from current
- **AND** it SHALL validate the full materialized artifact before replacing the
  canonical current artifact
- **AND** it SHALL render `current/export.md` from the materialized artifact
- **AND** it SHALL not persist a patch-only artifact as current.

#### Scenario: Non-overlapping section patch is applied after unrelated change

- **WHEN** the current artifact hash differs from the patch diagnostic base hash
- **AND** every section listed in `read_section_hashes` still matches current
- **THEN** applyResult SHALL allow the patch to proceed
- **AND** it SHALL preserve unrelated current sections.

#### Scenario: Section patch changes language or resolver state

- **WHEN** an `update_patch` bundle attempts to change language, topic
  definition, topic resolver, or resolved paper set
- **THEN** applyResult SHALL reject the patch and require `update_full`.

#### Scenario: Old topic directory is detected

- **WHEN** a topic directory only contains the old `current.md` and
  `current.json` files
- **THEN** the service SHALL mark the topic as `legacy_invalid` or
  `needs_recreate`
- **AND** it SHALL NOT treat old `current.md` as the v2 display source of truth
- **AND** it SHALL NOT interpret old `current.json` as v2 metadata.

#### Scenario: Topic row is projected

- **WHEN** the Synthesis service builds a topic row for the Workbench snapshot
- **THEN** the row SHALL prefer structured summary, paper count, external
  literature count, language, coverage, and completion fields over
  Markdown-derived preview text.

#### Scenario: Update intent is projected

- **WHEN** the Synthesis service builds a topic row for a stale, incomplete, or
  dirty topic
- **THEN** it SHALL derive a host-owned update intent from freshness, coverage,
  stale reasons, and dirty reasons
- **AND** the intent SHALL include prefillable topic id, language, update scope,
  update mode, update reason, action label, and whether update is allowed or
  should be treated as repair/rebuild.

#### Scenario: Update context is requested

- **WHEN** an update synthesis job requests topic context
- **THEN** the Synthesis service SHALL return current artifact context, metadata,
  resolver, resolved paper set, freshness state, base hashes, and a recommended
  update derived from the topic state
- **AND** the workflow submit dialog SHALL NOT need to carry full stale reason
  details or old artifact content as user-editable parameters.

#### Scenario: Paper digest is resolved for Topic Detail

- **WHEN** the Workbench requests a paper digest for a structured topic paper
  evidence entry
- **THEN** the host SHALL resolve the original `digest-markdown` payload through
  the stored `digest_ref`
- **AND** it SHALL return the digest Markdown and current source hash when the
  payload is available
- **AND** it SHALL report a source-changed state when the current hash differs
  from the hash recorded in the topic artifact.

#### Scenario: Paper digest cannot be resolved

- **WHEN** the stored `digest_ref` no longer resolves to a readable digest
- **THEN** the host SHALL return a bounded unavailable/error DTO
- **AND** it SHALL NOT fail the entire structured topic artifact read.

## ADDED Requirements

### Requirement: Apply decision uses operation-appropriate optimistic checks

Workflow apply decisions SHALL use bundle-level base-hash checks for create and
full-update operations, and section read-set checks for update-patch operations.

#### Scenario: Create or full update conflicts with current state

- **WHEN** a create or `update_full` bundle is applied
- **AND** current hashes differ from bundle `base_hashes`
- **THEN** apply decision SHALL be `conflict`
- **AND** it SHALL preserve the candidate without replacing the current
  structured artifact or Markdown export
- **AND** it SHALL NOT refresh the Zotero mirror.

#### Scenario: Patch read set conflicts with current state

- **WHEN** an `update_patch` bundle is applied
- **AND** any section listed in `read_section_hashes` no longer matches current
- **THEN** apply decision SHALL be `conflict`
- **AND** it SHALL preserve the candidate without replacing current sections or
  Markdown export
- **AND** it SHALL NOT refresh the Zotero mirror.

#### Scenario: Patch artifact hash drift does not conflict by itself

- **WHEN** an `update_patch` bundle is applied
- **AND** the current artifact hash differs from the patch diagnostic
  `current_artifact_hash`
- **AND** every section listed in `read_section_hashes` still matches current
- **THEN** applyResult SHALL NOT reject the patch solely due to full artifact hash
  drift.

### Requirement: Zotero mirror contains complete current topic state

The Synthesis mirror SHALL include enough current canonical state to recover
active topic synthesis artifacts when the local canonical root is missing.

#### Scenario: Mirror is refreshed from canonical current assets

- **WHEN** the Synthesis service rebuilds or refreshes the Zotero mirror
- **THEN** the mirror SHALL include state assets for topic definitions,
  resolvers, resolved paper sets, artifact index, artifact state, and deleted
  topic artifact state
- **AND** it SHALL include active topic current assets including
  `current/manifest.json`, `current/metadata.json`, `current/artifact.json`,
  `current/export.md`, and `current/sections/*.json`
- **AND** it SHALL NOT include history versions, conflict candidates, run
  workspaces, temporary files, citation graph snapshots, or graph layouts.

#### Scenario: Mirror shard identity is materialized

- **WHEN** a canonical asset is written to a Zotero note shard
- **THEN** the shard envelope SHALL include stable `asset_id`, `asset_path`, and
  `content_type`
- **AND** shard matching SHALL NOT depend on a Zotero note `title` field.

#### Scenario: Manifest shard is written

- **WHEN** the mirror is refreshed successfully
- **THEN** the mirror SHALL include a manifest shard listing all data shards,
  asset identities, sequence metadata, payload hashes, encoded hashes, and note
  keys.
