## 1. Assignment And Review Contracts

- [x] 1.1 Define one data-only assignment shape containing only `assignment_id`, one approved candidate snapshot, bounded `search_limits`, and a contained `result_path`.
- [x] 1.2 Create exactly one stable assignment per approved paper below `runtime/agent-batches/batch-NNN/` after Stage 30 confirmation.
- [x] 1.3 Keep worker descriptors limited to `assignment_id`, `worker_spec_path`, and readiness status, with no generated prompt, script, gate, finalizer, submission, import, Host, or hash contract.
- [x] 1.4 Define one main-agent `researchReviewPayload` schema with required metadata and conditional PDF review.
- [x] 1.5 Keep canonical metadata names in the formal schema, accepting `abstractNote` and rejecting `abstract`, title aliases, identifier aliases, and generic `extra` metadata.

## 2. Parallel Single-paper Research Runtime

- [x] 2.1 Return the complete ordered result-missing assignment set in `dispatch_plan.assignments` rather than a singleton dispatch cursor.
- [x] 2.2 Require all returned assignments to be launched before the first wait or gate reread, preserving one subagent per paper.
- [x] 2.3 Keep each worker task atomic and stage-free: bounded metadata/PDF research, one simple result write, immediate exit.
- [x] 2.4 Keep worker writes inside the assigned `runtime/agent-batches/batch-NNN/result.json`, with direct JSON return as the only unwritable-path fallback.
- [x] 2.5 Make result-file presence satisfy only the all-worker scheduling barrier and leave canonical metadata/PDF state unchanged.
- [x] 2.6 Return the complete remaining result-missing set on recovery while preserving already written results.
- [x] 2.7 Preserve approved candidate order when assignment keys are reloaded from sorted JSON state.

## 3. Main-agent Review And Serial Mutation

- [x] 3.1 Expose one `review_agent_result` cursor only after every worker result path exists.
- [x] 3.2 Let the main agent inspect and repair raw research, write one formal review per paper, and submit it through `--submit-agent-review`.
- [x] 3.3 Keep malformed, sparse, or unresolved worker output outside worker-side gate/finalizer loops; allow the main agent to submit an honest `not_attempted` review.
- [x] 3.4 Enforce three formal PDF route keys, early stop after the first verified PDF, and `skipped_after_verified_pdf` only for later routes.
- [x] 3.5 Deterministically generate canonical one-paper ingest payloads after all formal reviews are accepted.
- [x] 3.6 Preserve main-agent-only, one-paper-at-a-time Stage 70 `zotero-bridge mutation literature-ingest` execution and terminal Host receipt recording.

## 4. Static Prompt, Documentation, And Verification

- [x] 4.1 Put the sole worker-visible static delegation prompt directly in `SKILL.md`, including `{{WORKER_SPEC_PATH}}`, bounded research, one result, prohibited actions, stdout fallback, and immediate exit.
- [x] 4.2 Update metadata-resolution, PDF-probe, and ingest-output-recovery references without reducing their operational depth.
- [x] 4.3 Thin `assets/runner.json` to the minimal Skill trigger prompt and update the bundled workflow version/current-state documentation.
- [x] 4.4 Verify twelve approved papers produce twelve ordered descriptors in one dispatch plan and that completed assignments are not unnecessarily redispatched.
- [x] 4.5 Verify raw worker results cannot advance global state, main-agent formal review is required, canonical `abstractNote` is accepted, and `abstract` is rejected.
- [x] 4.6 Verify PDF early-stop semantics and Stage 70 receipt serialization.
- [x] 4.7 Verify `literature-metadata-search` independently accepts `abstractNote` and rejects `abstract`.
- [x] 4.8 Run Python syntax compilation, targeted core/workflow tests, Prettier, ESLint, `git diff --check`, OpenSpec validation, instruction-thickness measurement, and semantic-parity accounting.

## Verification Record

- Python compilation passed for `stage_runtime.py`, `batch_runtime.py`, and `gate_runtime.py`.
- Focused literature-search-ingest core tests passed: 13 passing.
- Focused literature-metadata-curator workflow tests passed: 28 passing.
- Targeted Prettier, ESLint, JSON parsing, `git diff --check`, built-in workflow manifest, and strict OpenSpec validation passed.
- Instruction baseline before this implementation was 2,450 lines and 100,897 normalized non-whitespace characters across `SKILL.md` and the three direct operational references. The implemented surface is 2,568 lines and 101,755 normalized non-whitespace characters; each individual file remains above 95% of its baseline character count and no file lost substantive instruction lines.
- Semantic parity review counts: unmapped 0, downgraded 0, unauthorized dropped 0, intra-package duplicate 0. The removed units are limited to the explicitly replaced worker-side multi-stage/finalizer/probe/hash-manifest orchestration.
- `check:content-package-release` was executed and reported that the published stable GitHub content feed does not match the newly modified local package semantics. No feed, version, release asset, or unrelated release state was changed as part of this implementation.
