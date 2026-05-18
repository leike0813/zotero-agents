# Design: Topic Synthesis Structured Artifact

## Artifact Contract

The new canonical topic artifact is assembled from section files written by the
skill. The run workspace should contain a manifest such as
`result/topic-analysis.json`; the manifest fields point to section JSON files
for the topic, summary, claims, timeline events, paper evidence, external
literature analysis, coverage, gaps, source artifacts, and diagnostics. The
plugin validates those sections, materializes a complete canonical structured
artifact, and keeps Markdown as a compatibility export for copy and existing
review workflow inputs.

The structured artifact uses:

- `schema_id: "synthesis.topic_synthesis_artifact"`
- `schema_version: "2.0.0"`
- `topic`
- `summary`
- `claims`
- `timeline_events`
- `paper_evidence`
- `external_literature_analysis`
- `coverage`
- `gaps`
- `source_artifacts`
- `diagnostics`
- `language`

Claims and timeline events must be evidence-linked. Their required evidence
references point to `paper_evidence` entries from the resolved paper set. External
references may appear in external literature analysis and citation context, but
do not serve as main claim/timeline evidence nodes.

`paper_evidence` stores topic-local evidence metadata and stable artifact
locators, not full paper digest bodies. Each paper evidence entry should include
a `digest_ref` pointing to the original `digest-markdown` payload using
host-resolvable identity such as `paper_ref`, `item_ref`, `note_key`,
`payload_type`, `payload_hash`, and the source artifact timestamp when known.
The structured topic artifact must not duplicate full `digest-markdown` text.

## Skill Responsibilities

The first implementation phase does not add a host-side evidence pack. The
single mode-driven `synthesize-topic` skill should be split into:

- `create-topic-synthesis`
- `update-topic-synthesis`

Both skills read paper-level artifacts through generic Zotero note payload tools
after resolver execution:

- `digest-markdown`
- `references-json`
- `citation-analysis-json`

The create skill accepts only the topic seed and language selection. It performs
semantic duplicate checking, creates the topic definition, proposes and resolves
the resolver, reads artifacts, and writes a complete set of section files.

The update skill accepts a topic id, update reason/scope, language selection,
and host-provided topic context. It reads the existing structured artifact and
metadata, decides whether resolver execution is needed, and writes either a full
replacement section set or a `section_patch` manifest.

Both skill instruction files should be rewritten in Chinese for this change.
The project-level synthesis design is maintained primarily in Chinese, and
Chinese skill instructions are expected to reduce ambiguity for lower-capability
models when following long staged workflows. Machine-facing names remain in
English: schema keys, payload types, stable ids, command names, artifact paths,
and final JSON fields.

Create and update should share a lightweight Topic Synthesis Runtime rather
than each implementing its own process. The runtime should follow the useful
parts of `literature-digest`: gate-controlled progression, run-local SQLite as
the only process-state source of truth, and a renderer/validator that emits the
final section files and result bundle. It should not copy the full single-paper
source-normalization and citation-parsing pipeline because topic synthesis
consumes already-generated paper artifacts.

Recommended package-local runtime shape:

```text
skills_builtin/create-topic-synthesis/
  scripts/gate_runtime.py
  scripts/stage_runtime.py
  scripts/runtime_db.py
  assets/schemas/
  assets/templates/
  references/
skills_builtin/update-topic-synthesis/
  scripts/gate_runtime.py
  scripts/stage_runtime.py
  scripts/runtime_db.py
  assets/schemas/
  assets/templates/
  references/
```

The run-local SQLite database is internal to one skill execution. It does not
replace plugin canonical assets. Formal persistence still happens only after
the plugin `applyResult` reads the result bundle and run workspace artifacts.

Suggested runtime stages:

- `stage_0_bootstrap`
- `stage_1_topic_intent`
- `stage_2_resolver`
- `stage_3_paper_workset`
- `stage_4_per_paper_analysis`
- `stage_5_cross_paper_synthesis`
- `stage_6_render_and_validate`
- `stage_7_completed`

Create mode uses `stage_1_topic_intent` for topic seed parsing, language
resolution, and duplicate checks. Update mode uses it to persist
`TopicUpdateIntent`, current metadata, base hashes, and recommended update.
Create must always validate a resolver through `synthesis.resolve_resolver`.
Update re-runs resolver only when recommended update or selected scope can alter
the paper set; otherwise it reuses the host-provided resolver and resolved paper
set.

The gate should enforce these invariants:

- the agent may only execute the current `next_action`;
- resolver validation precedes paper artifact reads;
- paper workset persistence precedes per-paper analysis;
- required per-paper analysis coverage precedes cross-paper synthesis;
- rendered and validated section outputs precede final JSON output.

The DB should persist workflow state, action receipts, topic intent, selected
definition/resolver, resolved papers, paper artifact locators and hashes,
paper-analysis rows, external-reference rows, claim candidates, timeline events,
external-literature themes, coverage diagnostics, section outputs, and artifact
registry rows. Highly structured outputs such as timeline events, paper
evidence, and coverage should be rendered from DB rows where possible. LLM work
should focus on per-paper semantic analysis, claim synthesis, external
literature themes, coverage/gaps explanation, and prose quality.

The prompt must require the agent to summarize how library papers support each
claim, derive timeline events from library papers, and perform a separate
analysis of library-external references. External literature analysis should
explain background role, method lineage, why the external works were cited,
likely missing key works, and evidence limitations. It should also include a
structured representative-reference table so the UI can render both prose and
inspectable rows.

## Section Output and Update Patch

Create and full-update operations return a complete section manifest. An
`update_patch` operation returns a section replacement patch manifest. Patch
granularity is section-level for v1; JSON Patch, JSON Merge Patch, and
field/path-level edits are intentionally out of scope because patch output is
agent-generated and must remain easy to validate.

Patch granularity is section-level for v1. Supported patchable sections are:

- `summary`
- `claims`
- `timeline_events`
- `paper_evidence`
- `external_literature_analysis`
- `coverage`
- `gaps`
- `source_artifacts`
- `diagnostics`

`topic`, `topic_resolver`, and `resolved_paper_set` changes require a full
replacement unless a later change defines narrower resolver/paper-set patch
semantics.

The `update_patch` `analysis_manifest_path` points to a patch manifest such as
`result/topic-analysis.patch.json`. That manifest uses
`schema_id: "synthesis.topic_section_patch_manifest"` and includes:

- operation `update_patch`;
- topic id, language, schema version, and created timestamp;
- `base.current_manifest_hash` and `base.current_artifact_hash` for audit;
- `base.read_section_hashes` for optimistic CAS;
- `base.replace_section_hashes` for sections the patch will replace;
- `patch.mode: "section_replace"`;
- `patch.changed_sections`;
- `patch.unchanged_section_policy: "inherit_current"`;
- per-section `path`, `hash`, and `content_type`;
- reason/update scope summary;
- diagnostics, including `requires_full_update`.

`base.current_artifact_hash` is diagnostic, not the sole conflict condition. The
host applies read-set CAS: every section in `read_section_hashes` must still
match the current manifest. This permits non-overlapping concurrent section
updates to apply when their read sets are unchanged. `replace_section_hashes`
must be a subset of `read_section_hashes`, and `changed_sections`,
`replace_section_hashes`, and `patch.sections` must agree.

Host patch application is:

```text
read current/manifest.json + current/sections/*.json
  -> verify schema major and language
  -> verify read_section_hashes CAS
  -> read and hash changed section files
  -> replace named sections, inherit all others
  -> assemble full artifact
  -> run full schema and cross-section reference validation
  -> render current/export.md from the materialized artifact
  -> persist the complete current/ directory atomically
```

`update_patch` does not need to provide `markdown_path`; canonical Markdown
export is host-rendered after full materialization. Language changes, resolver
changes, resolved paper-set changes, topic-definition changes, schema major
changes, `requires_full_update: true`, or failed full-artifact validation force
`update_full`.

The final bundle should identify the operation explicitly:

- `create`
- `update_full`
- `update_patch`

Markdown export remains available. For create/full-update the skill may write a
complete Markdown export path as a run-workspace preview, but canonical
`current/export.md` is rendered by the host from the materialized artifact. For
`update_patch`, the host-rendered export is required and the patch does not
depend on a skill-provided Markdown file.

## Language Selection

Create and update workflows should expose a language parameter. The default is
`auto`, meaning the skill may infer from the topic seed or existing artifact.
Concrete language values should use BCP-47-like tags such as `zh-CN` and
`en-US`.

The requested/resolved language is recorded in:

- workflow parameters;
- skill final bundle;
- structured artifact `language`;
- canonical metadata;
- Markdown export metadata when available.

Structured prose fields, external literature analysis, labels intended for
display, and Markdown export should use the resolved language. Stable ids,
Zotero item refs, hashes, payload types, and schema keys remain language-neutral.

## Update Intent

The Workbench should not ask users to manually fill detailed stale reasons,
base hashes, changed sections, or old artifact context. The host derives a
`TopicUpdateIntent` from topic state and uses it to prefill the workflow submit
dialog.

The prefilled update parameters should stay small:

- `topicId`
- `language`
- `updateScope`
- `updateMode`
- `updateReason`

`topicId` is fixed by the selected topic. `language` defaults to the current
topic language or `auto`. `updateScope` defaults to `auto` and may be changed to
section-level values such as `claims`, `timeline`, `external_literature`,
`coverage`, or `full`. `updateMode` defaults to `auto`, allowing the host and
skill to choose `update_patch` or `update_full`. `updateReason` is derived from
freshness state and is mainly explanatory.

The full context is loaded at job time through
`synthesis.get_topic_context({ topicId, mode: "update" })`. That context should
include current artifact, metadata, resolver, resolved paper set, freshness
reasons, base hashes, and a host recommended update:

- reason;
- scope;
- mode;
- changed sections;
- stale/dirty diagnostics;
- whether update is allowed, discouraged, or requires repair.

Recommended default mapping:

- `artifact_changed` from digest changes: patch `claims`, `paper_evidence`, and
  possibly `timeline_events`.
- `artifact_changed` from references or citation-analysis changes: patch
  `external_literature_analysis`, `coverage`, and `source_artifacts`.
- `artifact_available`: patch sections unlocked by the newly available artifact.
- `artifact_missing`: patch `coverage` and `diagnostics`, and warn about
  evidence degradation.
- `resolver_paper_set_changed`: prefer `update_full`.
- `graph_changed`: patch `coverage` and `source_artifacts` unless the resolved
  paper set also changes.
- `dirty` states such as missing current files, missing metadata, invalid
  resolver, or index hash mismatch: show a Repair/Rebuild action and prefer
  `update_full`; do not silently run a section patch.

Workbench action labels should reflect the intent:

- fresh: no primary update action, optional Regenerate action;
- stale: Update;
- partial/incomplete coverage: Complete;
- dirty: Repair/Rebuild.

## Persistence

`applyResult` validates the final bundle, reads the section manifest and section
files, validates the assembled structured artifact, reads or materializes the
Markdown export, and persists both outputs under the topic canonical directory.
The structured artifact becomes the primary current artifact. Markdown remains a
derived export.

Metadata should record:

- `manifest_hash`
- `structured_hash` / `artifact_hash`
- `markdown_hash` / `export_hash`
- `metadata_hash`
- `section_hashes`
- `bundle_hash`
- `paper_count`
- `external_literature_count`
- `language`
- `operation`
- coverage summary
- artifact metadata supplied by the skill

Hash terminology is fixed across persistence, index rows, mirror manifests, and
base-hash checks:

- `manifest_hash`: canonicalized `current/manifest.json` hash.
- `structured_hash` / `artifact_hash`: canonicalized `current/artifact.json`
  hash. These names are aliases for the same content.
- `markdown_hash` / `export_hash`: `current/export.md` content hash. These
  names are aliases for the same content.
- `metadata_hash`: canonicalized `current/metadata.json` hash.
- `section_hashes`: canonical hashes for every `current/sections/*.json` file,
  recorded in `current/manifest.json`.
- `base_hashes`: bundle-level optimistic CAS for create/full update, using
  host-provided current manifest/artifact/export/metadata/index hashes.
- `read_section_hashes`: update-patch read-set CAS. Patch conflict decisions use
  this read set rather than complete artifact hash equality.

Apply conflict rules:

- `create` and `update_full` compare bundle-level `base_hashes` with current
  hashes.
- `update_patch` compares patch-manifest `read_section_hashes` with current
  section hashes.
- `current_artifact_hash` / `structured_hash` drift is diagnostic for
  `update_patch`; a non-overlapping patch may still apply when its read set
  remains unchanged.

This redesign does not preserve the old topic persistence contract. In the old
system `topics/<topicId>/current.md` was the display source and
`topics/<topicId>/current.json` was a `synthesis.topic_artifact_metadata`
envelope, not the current artifact. V2 removes both names from the canonical
topic contract to avoid overloading `current.json`.

V2 topic canonical state is stored under an explicit `current/` directory:

```text
synthesis/
  state/
    index.json
    topic-definitions.json
    resolvers.json
    resolved-paper-sets.json
    artifact-state.json
    deleted-topic-artifacts.json
    log.jsonl

  topics/<topicPathId>/
    current/
      manifest.json
      metadata.json
      artifact.json
      export.md
      sections/
        topic.json
        summary.json
        claims.json
        timeline-events.json
        paper-evidence.json
        external-literature-analysis.json
        coverage.json
        gaps.json
        source-artifacts.json
        diagnostics.json
```

The source-of-truth pair is `current/manifest.json` plus
`current/sections/*.json`. The manifest records section paths, section hashes,
assembled artifact hash, Markdown export hash, schema version, language,
operation, and timestamps. `current/artifact.json` is the deterministic
materialized full artifact used by UI, MCP read APIs, and review input.
`current/metadata.json` is host-managed metadata and projection input.
`current/export.md` is the Markdown compatibility export.

Old Markdown-only topic directories are not read as v2 topics and are not
batch-migrated. If discovered, they should be marked `legacy_invalid` or
`needs_recreate` and prompt the user to run `create-topic-synthesis` again.

## Synthesis Sync and Recovery

Canonical assets remain the source of truth. Zotero anchor and note shards are a
sync mirror and disaster-recovery entry point only; agents and workflow result
bundles must not write them directly.

The current mirror is not yet usable enough for recovery. Runtime evidence shows
that anchor creation can succeed while shard creation fails with
`Error: 'title' is not a valid field for type 'note'`. The adapter should stop
depending on a Zotero note `title` field and identify shards from their hidden
payload envelope instead. The visible note body may still include a human-facing
title or metadata block.

The mirror payload scope also needs to expand. Today it only mirrors selected
state files, which is insufficient to recover a topic because active topic
`current/` canonical assets are not represented. The target mirror scope is the
complete current state:

- state assets: topic definitions, resolvers, resolved paper sets, artifact
  index, artifact state, and deleted-topic artifact state;
- active topic current assets: `current/manifest.json`,
  `current/metadata.json`, `current/artifact.json`, `current/export.md`, and
  `current/sections/*.json`.

History versions, conflict candidates, run workspaces, temporary files, unified
citation graph snapshots, and graph layouts stay out of Zotero note shards.
Citation graph and layouts are rebuildable projections; after shard recovery
they should be regenerated from the local library and paper artifacts rather
than restored from Zotero shards.

Every shard should carry stable asset identity fields:

- `asset_id`: logical identifier such as `state:index`,
  `topic:<topicId>:current-manifest`, or `topic:<topicId>:section:claims`;
- `asset_path`: synthesis-root-relative path such as `state/index.json`,
  `topics/object-detection/current/manifest.json`, or
  `topics/object-detection/current/sections/claims.json`;
- `content_type`: `json`, `markdown`, or `text`.

The mirror should include a manifest shard. The manifest shard lists all data
shards with asset identity, sequence metadata, hashes, and note keys. This lets
a host recover canonical current assets from Zotero child notes when the local
canonical root is missing.

Persistence and mirror refresh rules:

- `applyResult` writes canonical structured artifacts and Markdown export first,
  then refreshes the mirror.
- Mirror refresh failure never rolls back canonical persistence; it returns a
  warning/diagnostic instead.
- Base-hash conflict candidates are local-only and do not refresh the mirror.
- Existing broken mirrors are repaired by an explicit Workbench action
  `rebuildSynthesisMirror`; there is no startup silent repair that writes Zotero
  notes.
- Recovery from shards is only available when the canonical root is missing,
  shards validate successfully, and the user confirms `recoverSynthesisFromMirror`.
  Recovery writes current assets only and does not restore history or conflict
  candidates.

### Recovery Safety Model

Shard recovery must use strict allowlists and a temporary restore directory. It
must not trust note titles, display HTML, or unvalidated shard paths.

Path and identity rules:

- `asset_path` must be synthesis-root-relative.
- Absolute paths, drive prefixes, UNC paths, `..`, empty segments, duplicated
  separators, and backslash traversal are rejected.
- Allowed state asset paths are exactly `state/index.json`,
  `state/topic-definitions.json`, `state/resolvers.json`,
  `state/resolved-paper-sets.json`, `state/artifact-state.json`, and
  `state/deleted-topic-artifacts.json`.
- Allowed topic asset paths are under `topics/<topicPathId>/current/`.
- `state/unified-citation-graph.json`, layouts, history, run workspaces, and
  temporary files are outside the recovery allowlist.
- `asset_id` must be unique.
- `asset_id` and `asset_path` must agree. For example,
  `topic:x:section:claims` may only map to
  `topics/x/current/sections/claims.json`.
- `content_type` must match the asset kind and path extension.

Manifest and data-shard rules:

- The manifest shard must list every data shard.
- Every data shard must validate `payload_hash`, `encoded_hash`, sequence
  metadata, and content type.
- Missing shards, duplicate shards, hash mismatches, sequence mismatches,
  unknown assets, and duplicate `asset_id` values make the recovery plan invalid
  or degraded.
- If multiple manifest shards exist, the host may choose only the newest
  complete valid manifest. Multiple valid manifests with different content are
  ambiguous/degraded and must not trigger automatic recovery.

Write rules:

- When the canonical root exists, recovery is not executable; only mirror
  rebuild is allowed.
- When the canonical root is missing, confirmed recovery writes into a temporary
  directory first.
- The host may promote the temporary directory only after decoding, path checks,
  hash checks, manifest checks, and canonical health checks all pass.
- A failed promote must not leave a half-restored current state.

Planned service actions are `rebuildMirrorFromCanonical()` and
`recoverCanonicalFromMirror({ confirm: true })`. They are documented here for
the subsequent implementation phase; this design artifact update does not
implement them.

## Workbench UX

Topic cards and table rows open a structured Topic Detail view rather than a
Markdown reader. The preferred layout is a dense research workbench:

- main reading region: left-side vertical tabs for Overview, Claims, External
  Literature, and Coverage & Gaps, with the selected section rendered as the
  primary reading surface;
- right inspector: full-height Evidence Explorer with a default width of 360px
  and a bounded resize range from 300px to 560px;
- bottom rail: a horizontal single-track timeline pinned to the bottom of the
  main region.

Timeline markers represent library papers or topic-level events/phases. Hover
shows title, year, and evidence summary. Click opens a temporary modal. The
modal requests the original paper digest through the host, using the clicked
paper's `paper_evidence.digest_ref`, and renders the resolved `digest-markdown`
payload as the primary modal body. The modal also shows related claims, citation
context, source freshness, and an Open Zotero Item action. The modal is
transient and must not mutate topic selection state.

If the current resolved digest hash differs from the `digest_ref.payload_hash`
recorded when the topic was generated, the modal should still open the current
digest when available but display a source-changed or stale-source warning. If
the digest cannot be resolved, the modal should show a bounded error state with
the paper metadata and provenance details rather than failing the whole Topic
Detail view.

External Literature Analysis is a dedicated section with analytic prose, themes,
representative references, citation contexts, contribution-to-topic notes, and
limitations. It is not rendered as a main timeline lane.

The UI should follow a restrained research-workbench design: neutral light
surface, high-contrast text, blue for primary actions, orange only for sparing
attention markers, visible focus states, and reduced-motion support.

The first implementation should follow the design tokens captured in
`artifact/topic_synthesis_detail_design_tokens_20260516.md`. Important values
include a neutral app background `#eef3f8`, white panels, primary text
`#172033`, a 108px bottom timeline, a `-12px` calibrated timeline pin offset,
and high-contrast timeline pins. Default pins use `#2563eb`, selected pins use
`#1d4ed8`, and warning pins use `#d97706`; selected pins must not turn white or
otherwise lose contrast against the panel background.

## Compatibility

`getReviewInput` continues to include Markdown because existing review workflow
contracts require it. It also exposes the structured topic artifact so future
review workflows can consume claims, timeline, evidence, and external literature
without reparsing Markdown.

The Unified Citation Graph remains a deterministic projection of library papers,
external references, and citation edges. Topic timeline remains an interpretive
topic artifact section and is not written back into the citation graph.

## Runtime Failure and Resume Model

The package-local Topic Synthesis runtime SQLite database is the run-local source
of truth. Prompt memory, chat history, and rendered temporary files must not
replace runtime DB state.

Every stage uses one of these states:

- `pending`
- `running`
- `completed`
- `failed_retryable`
- `failed_terminal`
- `canceled`

Runtime rules:

- Every external action writes an `action_receipts` row using a deterministic
  action id so retry and resume are idempotent.
- After every state-changing write, the skill reruns the gate and executes only
  the returned `next_action`.
- Resume recomputes the current stage and next action from SQLite, not from
  prompt memory.
- Materialized sections, manifests, Markdown previews, and final stdout JSON are
  registered in `artifact_registry` with path, hash, schema/content type, and
  generating stage.
- Final stdout JSON is allowed only after `stage_7_completed`.
- Partial sections, partial manifests, unvalidated artifacts, and unregistered
  files are never valid final bundles.
- Cancellation remains a no-op `topic_synthesis_canceled` result.
- Runtime DB schema version mismatch is terminal; the runtime must not guess a
  migration.
- Retryable errors return to the current stage gate next action. Terminal errors
  cannot silently retry or skip stages.
- `update_patch` must record read sections, replacement sections, and the
  rendered patch manifest in the runtime DB before final stdout.

## Implementation Roadmap

This change should be implemented in phases. Each phase should leave a
verifiable intermediate state; later phases should not depend on UI inspection
as the primary correctness signal.

### Delivery Matrix

| Phase | Goal | Main Deliverables | Required Tests | Exit Criteria | Explicitly Out of Scope |
| --- | --- | --- | --- | --- | --- |
| 0 | Freeze design and acceptance boundaries | Long design doc, OpenSpec design/spec/tasks, UI tokens, sync/recovery and runtime boundaries | `openspec validate --strict` | Design artifacts are coherent and actionable | Source implementation, test implementation, UI code |
| 1 | Contracts, schemas, and red tests | Final bundle, section manifest, section patch, current/ directory, mirror safety, runtime gate tests | Schema/service/runtime tests fail for explicit missing behavior | Red tests cover the contract surface | Business logic implementation, real UI |
| 2 | Package-local runtime and skill split | Chinese create/update skills, package-local SQLite stages, renderer | Runtime gate, SQLite, renderer tests | Run workspace can produce manifest/stdout | Canonical persistence, Zotero mirror |
| 3 | Host persistence | V2 `current/` writes, section patch apply, host-rendered export, metadata/index | applyResult, conflict, non-overlap patch tests | Current state is readable and hashes agree | Recovery, complete Topic Detail UI |
| 4 | Mirror/recovery | Shard envelope, manifest shard, rebuild/recover, path safety | Mirror/recovery/security smoke tests | Complete current state can be rebuilt/recovered | Graph/layout/history/run workspace sync |
| 5 | Update intent and job-time context | `TopicUpdateIntent`, prefilled workflow, `get_topic_context`, digest resolver DTO | UI model / MCP context tests | User submits simple params, job context is complete | Synthesis contract changes, complex UI |
| 6 | Topic Detail UI | Left tabs, main reading region, right Evidence Explorer, bottom timeline, digest modal | UI model/render tests plus object-detection fixture review | Real topic content is readable, scrollable, and interactive | Persistence/skill contract changes |
| 7 | Review input and regression hardening | Markdown compatibility, structured review input, regression tests | Build + workflow/UI/review/integration tests | Regression passes and change is ready for implementation closeout | New capability expansion |

### Phase 0: Freeze Design and Acceptance Boundaries

Goal: keep the structured artifact, Topic Detail UI, sync/recovery, and skill
runtime scope stable before implementation starts.

Deliverables:

- OpenSpec delta specs and the long-form design document agree.
- Topic Detail design tokens are the first UI implementation baseline.
- Create/update skill instructions are planned as Chinese-first documents while
  machine-facing identifiers remain English.
- Zotero note shards mirror complete current state but exclude graph/layout,
  history versions, run workspaces, and conflict candidates.

Acceptance:

- `openspec validate redesign-topic-synthesis-structured-artifact --strict`
  passes.

Phase 0 handoff state:

- OpenSpec artifacts are complete: proposal, design, delta specs, and tasks.
- Strict validation passes with
  `openspec validate redesign-topic-synthesis-structured-artifact --strict`.
- Phase 1 is limited to contract, schema, service/runtime, and UI model red
  tests; business logic, real UI, and runtime synthesis implementation remain
  out of scope.
- Topic Detail design tokens are a Phase 6 UI implementation input, not an
  unfinished Phase 0 task.

### Phase 1: Contracts, Schemas, and Red Tests

Goal: encode the artifact and runtime boundaries as tests before broad
implementation.

Deliverables:

- Section manifest, section patch, final bundle, and language propagation tests.
- Structured artifact validation tests for paper-evidence links, timeline
  evidence, external literature placement, and `digest_ref` locators.
- Mirror foundation tests for `asset_id`, `asset_path`, `content_type`, and
  manifest shard round-trip.
- Runtime gate, SQLite, and renderer red tests.

Acceptance:

- New tests fail on explicit missing behavior rather than on compile/import
  failures.

### Phase 2: Shared Topic Synthesis Runtime and Skill Split

Goal: give create/update skills a stable run-local execution skeleton without
yet changing formal canonical persistence.

Deliverables:

- Package-local runtime scripts for both create/update skills with gate, stage
  runtime, runtime DB, schemas, templates, and references.
- Split `create-topic-synthesis` and `update-topic-synthesis`.
- Chinese-first `SKILL.md` files for both skills.
- Runtime stages from bootstrap through render/validate.
- Renderer materializes section JSON, section manifest, Markdown export, and
  final stdout JSON from SQLite.

Acceptance:

- Create can produce a complete section manifest from a seed.
- Update can produce either `update_full` or `update_patch` from topic context.
- Gate blocks skipped resolver, paper workset, per-paper analysis, and render
  validation steps.

### Phase 3: Host Persistence and Structured Canonical Assets

Goal: make the plugin host accept runtime outputs and persist structured topic
artifacts as the UI source of truth.

Deliverables:

- `applyResult` reads `analysis_manifest_path` and section files;
  `markdown_path` is only an optional run-workspace preview input for
  create/full update.
- Create/full update assemble and validate complete structured artifacts.
- Section patch verifies read-set CAS, replaces named sections, validates the
  full materialized artifact, then writes current.
- Host renders canonical `current/export.md` after full materialization.
- V2 `current/manifest.json`, `current/sections/*.json`,
  `current/artifact.json`, `current/metadata.json`, `current/export.md`, and
  index-facing hashes are persisted.
- Markdown-only topics are marked `legacy_invalid` / `needs_recreate`, with no
  fallback reading or batch migration.

Acceptance:

- Metadata/index-facing rows include structured hash, Markdown hash, paper
  count, external literature count, language, and coverage summary.
- Base-hash conflicts remain local candidates and do not overwrite current.

### Phase 4: Synthesis Mirror and Recovery

Goal: turn the Zotero anchor/note shard mirror into a recoverable current-state
mirror.

Deliverables:

- Fix Zotero note shard creation so it does not rely on invalid note `title`
  mutation.
- Extend shard envelope and manifest entries with asset identity fields.
- Mirror full current state: required state assets plus active topic
  `current/` assets.
- Write/read manifest shard.
- Add `rebuildMirrorFromCanonical()`.
- Add confirmed `recoverCanonicalFromMirror({ confirm: true })`.
- Keep graph/layout out of shards as rebuildable projections.

Acceptance:

- Missing/degraded mirror can be rebuilt from canonical through Workbench action.
- Missing canonical root can be recovered from valid shards after confirmation.
- Existing canonical root cannot be overwritten by shard recovery.

### Phase 5: Update Intent, Prefill, and MCP Context

Goal: make update invocation simple for users and complete for jobs.

Deliverables:

- `TopicUpdateIntent` derived from freshness, coverage, stale reasons, and dirty
  reasons.
- Topic row actions for Update, Complete, and Repair/Rebuild.
- Submit dialog prefilled only with `topicId`, `language`, `updateScope`,
  `updateMode`, and `updateReason`.
- `synthesis.get_topic_context` returns current artifact, metadata, resolver,
  resolved paper set, base hashes, freshness, and `recommended_update`.
- Host DTO/action resolves original paper `digest-markdown` through
  `paper_evidence.digest_ref`.

Acceptance:

- Stale, incomplete, and dirty topic actions are deterministic and testable.
- Update jobs do not require user-editable old artifact bodies or stale reason
  details.

### Phase 6: Topic Detail UI

Goal: make structured Topic Detail the primary topic reading experience.

Deliverables:

- Topic open action renders structured Topic Detail.
- Main reading area uses left tabs for Overview, Claims, External Literature,
  and Coverage & Gaps.
- Evidence Explorer is full-height and horizontally resizable.
- Bottom horizontal timeline uses the documented design tokens.
- Marker hover/click interactions and digest modal are wired to host DTOs.
- External Literature Analysis renders analytic prose, themes, and structured
  reference tables.
- Markdown export/copy stays secondary.

Acceptance:

- Real object-detection topic content remains readable and scrollable.
- Digest hash mismatch shows source-changed warning.
- Legacy Markdown-only topics do not enter Topic Detail and show a
  needs-recreate prompt.

### Phase 7: Review Input, Regression, and Release Hardening

Goal: keep existing review workflows and Synthesis Workbench integrations
stable.

Deliverables:

- `getReviewInput` keeps Markdown for existing workflows.
- Structured topic artifact content is exposed for future workflows.
- MCP review input, synthesis tab UI, workflow contract, integration, and Zotero
  runtime smoke tests are updated.

Acceptance:

- `npm run build`
- `npm run test:node:core -- --grep "Synthesize topic workflow contract"`
- `npm run test:node:core -- --grep "Synthesis tab UI"`
- `npm run test:node:core -- --grep "Synthesis review input"`
- Integration tests covering applyResult, topic snapshot rows, and mirror
  rebuild/recover pass.

Phase dependency:

```text
Phase 0 -> Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6 -> Phase 7
```

Some Phase 4 foundation work can be prepared after Phase 3 paths are stable, but
mirror payload implementation must use the fixed
`topics/<topicPathId>/current/` asset paths. Phase 6 depends on the Topic Detail
DTO from Phase 3 and digest locator host action from Phase 5.

## Risks

- Skill-side normalization can vary because host-side evidence packs are out of
  scope for this phase. The mitigation is a strict structured schema and prompt
  requirements tying claims/timeline to library paper evidence.
- Existing Markdown-only topic directories are intentionally incompatible with
  v2. The mitigation is an explicit `needs_recreate` state instead of silent
  fallback or migration.
- Original digest resolution depends on the paper-level artifact still being
  present. The mitigation is stable locator metadata plus source-hash warnings
  when the digest has changed since synthesis generation.
- Dense topic detail can become visually heavy. The first implementation should
  keep hierarchy clear and avoid nested card-on-card layouts.
