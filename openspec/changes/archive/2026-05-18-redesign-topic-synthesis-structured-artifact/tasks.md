# Tasks

## 1. OpenSpec and Design Artifacts

- [x] Create OpenSpec change `redesign-topic-synthesis-structured-artifact`.
- [x] Add proposal, design, task list, and delta specs.
- [x] Add long-form design document under `artifact/`.
- [x] Validate OpenSpec change strictly.
- [x] Add Topic Detail design token artifact under `artifact/`.
- [x] Document Synthesis sync and recovery design in artifact and OpenSpec
  change files.
- [x] Document shared gated Topic Synthesis Runtime and Chinese-first skill
  rewrite requirements in artifact and OpenSpec change files.
- [x] Document phased implementation roadmap in artifact and OpenSpec change
  files.
- [x] Freeze v2 topic canonical current directory semantics and remove legacy
  `current.md` / `current.json` compatibility from the active design.
- [x] Define the v2 `section_patch` contract as section replacement manifest,
  read-set CAS, host full revalidation, and host-rendered Markdown export.
- [x] Document Topic Detail layout terminology, sync recovery safety boundary,
  runtime failure/resume model, and phase delivery matrix.
- [x] Freeze hash terminology, operation-specific CAS rules, optional
  `markdown_path`, and exact recovery state asset allowlist.
- [x] Record Phase 0 handoff state: OpenSpec artifacts complete, strict
  validation passes, and Phase 1 red-test boundary is defined.

## 2. Contract Tests

- [x] Add schema tests accepting complete section manifests and optional
  create/full-update `markdown_path` preview inputs.
- [x] Add schema tests accepting `section_patch` manifests with changed section
  paths, `read_section_hashes`, replacement section hashes, and
  `inherit_current` unchanged-section policy.
- [x] Add schema tests rejecting field-level/JSON-patch update patch payloads,
  replacement sections outside the read set, and patch Markdown dependencies.
- [x] Add schema tests rejecting embedded Markdown and missing required section
  paths.
- [x] Add schema tests for language parameter propagation.
- [x] Add hash terminology tests proving manifest, structured/artifact,
  Markdown/export, metadata, and section hashes are computed from the documented
  canonical files.
- [x] Add UI model/service tests for deriving `TopicUpdateIntent` from stale,
  incomplete, and dirty topic states.
- [x] Add MCP/service tests for `get_topic_context` returning
  `recommended_update`.
- [x] Add structured artifact validation tests for claims/timeline evidence links.
- [x] Add structured artifact validation tests for `paper_evidence.digest_ref`
  locators without embedded full digest bodies.
- [x] Add tests ensuring external references enter `external_literature_analysis`
  rather than main timeline evidence nodes.
- [x] Add foundation tests for mirror shard envelopes with `asset_id`,
  `asset_path`, and `content_type`.
- [x] Add foundation tests for manifest shard round-trip and data-shard listing.
- [x] Add integration tests verifying mirror payload includes state assets and
  active topic `current/` assets.
- [x] Add integration tests marking old `current.md` / `current.json` topic
  directories as `legacy_invalid` or `needs_recreate`.
- [x] Add applyResult tests proving create/update_full use bundle-level
  `base_hashes`, while update_patch uses `read_section_hashes`.
- [x] Add Zotero runtime smoke coverage proving shard creation does not mutate an
  invalid note `title` field.
- [x] Add recovery tests for confirmed canonical restore from valid shards.
- [x] Add recovery tests preventing shard recovery from overwriting existing
  canonical assets.
- [x] Add recovery safety tests rejecting absolute paths, `..`, backslash
  traversal, duplicate `asset_id`, asset id/path mismatches, and content-type
  mismatches.
- [x] Add recovery allowlist tests proving only documented state files and
  active topic `current/` assets can be recovered.
- [x] Add recovery tests rejecting missing shards, duplicate shards, payload hash
  mismatches, encoded hash mismatches, seq/total mismatches, and ambiguous
  manifests.
- [x] Add recovery tests proving confirmed restore writes through a temporary
  directory and does not leave half-restored current state on promote failure.
- [x] Add UI model tests for mirror missing/degraded rebuild actions and
  recoverable-root confirmation actions.
- [x] Add runtime gate tests for create and update stage progression.
- [x] Add runtime failure/resume tests for stage states, retryable failure,
  terminal failure, cancellation, DB schema mismatch, and gate-computed resume.
- [x] Add runtime action receipt idempotency tests for retried external actions.
- [x] Add runtime artifact registry tests rejecting partial or unregistered
  section/manifest/stdout files as final outputs.
- [x] Add runtime SQLite tests for persisted topic intent, resolver, paper
  workset, per-paper analysis, section outputs, and artifact registry rows.
- [x] Add renderer tests proving timeline, paper evidence, coverage, section
  manifest, Markdown export, and final stdout JSON are materialized from SQLite.
- [x] Add applyResult tests proving non-overlapping section patches can apply
  when read section hashes still match despite artifact hash drift.

## 3. Skill and Workflow Contract

- [x] Split `synthesize-topic` into `create-topic-synthesis` and
  `update-topic-synthesis` skills/workflows.
- [x] Rewrite `create-topic-synthesis` and `update-topic-synthesis` skill
  instructions in Chinese while keeping schema keys, command names, payload
  types, artifact paths, and JSON fields in English.
- [x] Add package-local Topic Synthesis runtime scripts to create/update skills
  with gate, stage runtime, runtime DB, schemas, templates, and reference docs.
- [x] Implement runtime stages:
  `stage_0_bootstrap`, `stage_1_topic_intent`, `stage_2_resolver`,
  `stage_3_paper_workset`, `stage_4_per_paper_analysis`,
  `stage_5_cross_paper_synthesis`, `stage_6_render_and_validate`, and
  `stage_7_completed`.
- [x] Implement runtime stage states: `pending`, `running`, `completed`,
  `failed_retryable`, `failed_terminal`, and `canceled`.
- [x] Implement deterministic `action_receipts` for external action
  idempotency and resume.
- [x] Enforce gate invariants so resolver validation precedes paper artifact
  reads, paper workset persistence precedes per-paper analysis, and validated
  section outputs precede final JSON.
- [x] Enforce resume from SQLite state only; do not rely on prompt memory or
  unregistered run workspace files.
- [x] Block final stdout until all sections/manifests/stdout assets are
  registered in `artifact_registry` and validation has passed.
- [x] Update create skill instructions to accept seed + language, perform
  duplicate checks, and write a full section manifest.
- [x] Update update skill instructions to accept topic context + update scope +
  language and write either full section replacement or section replacement
  `section_patch`.
- [x] Define update workflow parameters as prefillable intent fields:
  `topicId`, `language`, `updateScope`, `updateMode`, and `updateReason`.
- [x] Update output schemas to require section manifests and operation values.
- [x] Update workflow/applyResult fixture expectations.
- [x] Preserve canceled output behavior.

## 4. Persistence and Service Model

- [x] Add structured topic artifact types and validator.
- [x] Assemble complete canonical structured artifacts from section files.
- [x] Apply `section_patch` updates against the current structured artifact and
  validate read-set CAS, materialized result, and cross-section refs before
  persistence.
- [x] Render canonical `current/export.md` on the host after create,
  update_full, and update_patch materialization.
- [x] Persist v2 topic current directories with `current/manifest.json`,
  `current/sections/*.json`, `current/artifact.json`,
  `current/metadata.json`, and `current/export.md`.
- [x] Store structured hash, Markdown hash, paper count, external literature count,
  language, operation, and coverage summary in metadata/index-facing rows.
- [x] Add host-side `TopicUpdateIntent` derivation from artifact freshness,
  coverage, stale reasons, and dirty reasons.
- [x] Extend `get_topic_context` for update jobs with `recommended_update` and
  complete current context.
- [x] Mark Markdown-only legacy topic directories as `legacy_invalid` /
  `needs_recreate` without fallback reading or batch migration.
- [x] Fix Zotero mirror adapter so note shard identity comes from hidden shard
  envelope rather than an invalid note `title` field.
- [x] Extend shard envelope and mirror manifest entries with `asset_id`,
  `asset_path`, and `content_type`.
- [x] Validate mirror recovery paths with a synthesis-root-relative allowlist
  and reject traversal, unknown paths, duplicate ids, id/path mismatches, and
  content-type mismatches.
- [x] Validate manifest/data shard integrity including payload hash, encoded
  hash, seq/total, missing shards, duplicate shards, and ambiguous manifests.
- [x] Restore from shards through a temporary directory and atomically promote
  only after all checks pass.
- [x] Expand mirror payload scope to include complete current state: required
  state assets plus active topic `current/` assets.
- [x] Add manifest shard writing and reading.
- [x] Add service action `rebuildMirrorFromCanonical()`.
- [x] Add confirmed service action `recoverCanonicalFromMirror({ confirm: true })`.
- [x] Keep citation graph and layout snapshots out of Zotero mirror payloads and
  treat them as rebuildable projections after recovery.

## 5. Workbench UI Model and Rendering

- [x] Add Topic Detail DTO and host command for opening structured topic artifacts.
- [x] Add topic row update actions that are visible for stale, incomplete, and
  dirty topics and prefill the update workflow submit dialog.
- [x] Add host-routed command/DTO for resolving original `digest-markdown`
  payloads from `paper_evidence.digest_ref`.
- [x] Replace primary topic open action with structured Topic Detail.
- [x] Use the Topic Detail design tokens as the implementation baseline for
  layout, colors, timeline geometry, and pin states.
- [x] Render Topic Detail with left-side tabs, main reading surface,
  full-height Evidence Explorer, bottom horizontal timeline, and External
  Literature Analysis.
- [x] Add hover/click timeline interactions and temporary paper-evidence modal
  that renders resolved digest markdown and warns on source hash mismatch.
- [x] Keep Markdown export/copy action as secondary UI.
- [x] Add Workbench action for user-triggered `rebuildSynthesisMirror` when
  canonical assets exist and the mirror is missing or degraded.
- [x] Add confirmed Workbench action for `recoverSynthesisFromMirror` only when
  canonical root is missing and valid shards are available.

## 6. Review Input Compatibility

- [x] Keep Markdown in review input for existing workflows.
- [x] Include structured topic artifact content in review input for future workflows.
- [x] Update MCP review input tests.

## 7. Verification

- [x] Run `npm run build`.
- [x] Run `npm run test:node:core -- --grep "Synthesize topic workflow contract"`.
- [x] Run `npm run test:node:core -- --grep "Synthesis tab UI"`.
- [x] Run `npm run test:node:core -- --grep "Synthesis review input"`.
- [x] Run integration tests covering applyResult and topic snapshot rows.

## 8. Phased Delivery Gates

- [x] Phase 1: complete contract/schema/runtime red tests before implementation
  broadens; do not implement business logic or UI in this phase.
- [x] Phase 2: deliver shared gated Topic Synthesis Runtime and Chinese-first
  create/update skills that can render run workspace outputs; do not write
  canonical assets in this phase.
- [x] Phase 3: deliver host persistence for v2 `current/` canonical artifacts,
  section patch, metadata/index rows, and legacy needs-recreate handling; do not
  implement shard recovery or full Topic Detail UI in this phase.
- [x] Phase 4: deliver full-current-state Zotero mirror, manifest shard,
  rebuild mirror, and confirmed shard recovery; do not mirror graph/layout,
  history, or run workspaces.
- [x] Phase 5: deliver `TopicUpdateIntent`, prefilled update submission,
  `get_topic_context` recommended update, and digest locator host DTO; do not
  change the synthesis artifact contract in this phase.
- [x] Phase 6: deliver structured Topic Detail UI using design tokens, timeline
  interactions, digest modal, Evidence Explorer, and external literature view;
  do not change persistence or skill contracts in this phase.
- [x] Phase 7: complete review input compatibility, regression tests, build, and
  integration verification; do not expand scope with new capabilities.
