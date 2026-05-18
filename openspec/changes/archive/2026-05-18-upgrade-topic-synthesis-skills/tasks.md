# Tasks

## 1. OpenSpec

- [x] Create OpenSpec change `upgrade-topic-synthesis-skills`.
- [x] Add proposal, design, tasks, and delta spec.
- [x] Validate the change with `openspec validate upgrade-topic-synthesis-skills --strict`.

## 2. Skill Packages

- [x] Add package-local runtime scripts to `create-topic-synthesis`.
- [x] Add package-local runtime scripts to `update-topic-synthesis`.
- [x] Add package-local schemas and Markdown template to both skills.
- [x] Add package-local workflow, paper analysis, and section authoring
  references to both skills.
- [x] Rewrite `create-topic-synthesis/SKILL.md` with Chinese-first concise
  operating discipline and package-local references.
- [x] Rewrite `update-topic-synthesis/SKILL.md` with Chinese-first concise
  operating discipline and package-local references.
- [x] Update both `assets/runner.json` prompts to use package-local runtime
  resources and final JSON constraints.
- [x] Remove default skill-package references to the retired shared runtime
  directory.
- [x] Rewrite both `SKILL.md` files as minimum-executable instructions with
  explicit input/output contracts, MCP dependency, fail branch, script calls,
  core principles, and prohibitions.
- [x] Move runtime hard contract details into both `SKILL.md` files, including
  SQLite SSOT, fixed stages, stage states, failure handling, and
  `artifact_registry` gating.
- [x] Remove runtime-contract reference files so runtime hard constraints are
  documented only in `SKILL.md`.
- [x] Document all package-local script usage and command examples directly in
  each `SKILL.md`.
- [x] Rewrite references in Chinese as optional example-driven expansions, with
  hard constraints anchored in `SKILL.md`.
- [x] Upgrade gate output to include JIT fields: `execution_note`,
  `command_example`, `required_reads`, `required_writes`, and `progress`.
- [x] Add package-local stage write actions:
  `persist_topic_intent`, `persist_resolver`, `persist_paper_workset`,
  `persist_paper_analysis`, and `persist_cross_paper_synthesis`.
- [x] Make per-paper analysis a one-paper-at-a-time gated loop with the next
  `paper_ref` surfaced in gate progress.
- [x] Replace placeholder rendering with SQLite-SSOT render that blocks on
  missing required sections and verifies `artifact_registry` hashes.
- [x] Make update gate expose `recommended_update`, `operation`,
  `changed_sections`, and `read_section_hashes`, with patch render producing
  `topic-analysis.patch.json` and no `markdown_path`.

## 3. Tests

- [x] Update the synthesize topic workflow contract tests to assert
  self-contained create/update skill packages.
- [x] Update create skill documentation tests for duplicate check, resolver,
  paper workset, per-paper analysis, section authoring, and final stdout rules.
- [x] Add update skill documentation tests for `get_topic_context`,
  `recommended_update`, full/patch selection, and `section_patch` rules.
- [x] Update Topic Synthesis runtime contract tests to inspect package-local
  runtimes for both skills.
- [x] Add tests for minimum-executable `SKILL.md` bodies, MCP fail branches,
  explicit script call examples, and optional-reference positioning.
- [x] Add tests for Chinese references with concrete JSON or command examples.
- [x] Add runtime contract tests for JIT gate payloads, formal stage write
  actions, render blockers, non-placeholder rendering, and per-paper write
  documentation.

## 4. Verification

- [x] Run `npm run test:node:core -- --grep "Synthesize topic workflow contract"`.
- [x] Run `npm run test:node:core -- --grep "Topic synthesis runtime contract"`.
- [x] Run `npm run build`.

## 5. Artifact Probe and Cross-Paper Context Gate

- [x] Restore `synthesis.get_paper_artifact_manifest` and
  `synthesis.read_paper_artifacts` as MCP tools.
- [x] Make paper artifact bundle receipts a required SQLite gate before
  per-paper analysis, while allowing all artifacts to be missing.
- [x] Add deterministic `export_cross_paper_context` and require
  `source_context_hash` before cross-paper synthesis writes sections.
- [x] Enforce `paper_evidence.digest_ref` hashes against bundle receipts during
  render and against current host artifacts during apply.
- [x] Update create/update skill instructions and runner prompts for artifact
  probe, missing-artifact behavior, and cross-paper context use.
- [x] Add/update MCP, runtime, skill contract, and apply regression tests.
- [x] Run focused core tests, `npm run build`, and
  `openspec validate upgrade-topic-synthesis-skills --strict`.

## 6. Complete Library Index Gate

- [x] Make `synthesis.get_library_index` return deterministic paged index
  metadata including `cursor`, `next_cursor`, `has_more`, `returned`,
  `total_papers`, `index_hash`, and `page_hash`.
- [x] Add create runtime `library_index_pages` receipts and require a complete
  receipt chain before `persist_resolver`.
- [x] Update create skill instructions, runner prompt, design, and delta spec
  for the complete library index pagination loop.
- [x] Add/update MCP, runtime, and skill contract tests.
- [x] Run focused core tests, `npm run build`, and
  `openspec validate upgrade-topic-synthesis-skills --strict`.

## 7. Runtime Artifact Graph Validation

- [x] Make `synthesis.get_paper_artifact_manifest` return artifact status rows
  aligned with `synthesis.read_paper_artifacts`, without payload bodies.
- [x] Mirror host structured artifact graph checks in package-local runtime:
  `paper_evidence.id`, claim/timeline `evidence_refs`, and
  `external_literature_analysis.summary`.
- [x] Add/update MCP and runtime contract tests.
- [x] Move artifact availability consistency checks into Stage 4
  `persist_paper_analysis`, so unsupported single-paper evidence cannot enter
  cross-paper context.
- [x] Run focused core tests, `npm run build`, and
  `openspec validate upgrade-topic-synthesis-skills --strict`.

## 8. Artifact Probe Reliability

- [x] Make `synthesis.read_paper_artifacts` accept payload-type aliases
  (`digest-markdown`, `references-json`, `citation-analysis-json`) as well as
  canonical artifact names.
- [x] Add host probe diagnostics to artifact status rows:
  `probe_source`, `item_found`, `child_note_count`, `note_keys_seen`, and
  `payload_types_seen`.
- [x] Reject synthetic or contradictory artifact bundle receipts in
  package-local runtime, including rows that mark an artifact missing while the
  host probe saw that payload type.
- [x] Add/update MVP and runtime contract tests.
- [x] Run focused core tests, `npm run build`, and
  `openspec validate upgrade-topic-synthesis-skills --strict`.

## 9. Hash Tokenization Boundary

- [x] Add `synthesis.export_paper_artifact_bundle` so the host writes
  run-local artifact bundle payload files without returning payload hashes to
  the agent.
- [x] Update create/update gates, skill instructions, and runner prompts to use
  the export tool instead of agent-authored `read_paper_artifacts` JSON files.
- [x] Make runtime inject digest locators and final `paper_evidence.digest_ref`
  from SQLite bundle receipts rather than agent-authored payload hashes.
- [x] Strip hash-bearing fields from `cross-paper-context.json`.
- [x] Add/update MCP and runtime contract tests.

## 10. Stage 4 Batch Gate Reliability

- [x] Extend `synthesis.export_paper_artifact_bundle` to accept `paper_refs`
  batches and write a host-authored batch manifest.
- [x] Add batch runtime actions `persist_paper_artifact_bundles` and
  `persist_paper_analyses`, while retaining single-paper actions as repair
  fallbacks.
- [x] Update Stage 4 gate JIT output to return batch paper refs, batch MCP
  examples, and batch persist commands with a default batch size of 25.
- [x] Fix retryable failure marking so malformed Stage 4 payloads stay on
  Stage 4 instead of being reclassified as later-stage failures.
- [x] Update skill docs, runner prompts, OpenSpec design/spec, and contract
  tests so `synthesis.read_paper_artifacts` is diagnostics-only.
