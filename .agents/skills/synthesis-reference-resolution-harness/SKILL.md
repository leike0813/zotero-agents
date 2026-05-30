---
name: synthesis-reference-resolution-harness
description: Build and rerun the Synthesis reference-resolution benchmark workflow for this repository. Use when Codex needs to extract sanitized fixtures from the Synthesis DB, draft or review gold labels, run policy experiments against src/modules/synthesis/referenceMatcher.ts, compare precision/recall/candidate recall/danger false positives, or prepare a report before changing the literature-to-literature citation matcher.
---

# Synthesis Reference Resolution Harness

Use this project-local development skill to repeat the full matcher workflow:

1. Extract a sanitized fixture from a Synthesis SQLite DB.
2. Build review seeds from trusted citeKeys and production matcher candidates.
3. Review reference-to-paper matches in the local review UI.
4. Run the policy experiment matrix against reviewed gold labels.
5. Write an experiment report.
6. Only then change matcher rules and rerun the harness.

Do not place this skill under `skills_builtin/` or user-facing `skills/`. It is a repository development tool under `.agents/skills/`.

## Boundaries

- Treat `src/modules/synthesis/referenceMatcher.ts` as the algorithm SSOT. Do not copy matcher logic into this skill.
- Do not use `literature_matching_metadata` for literature-to-literature reference identity resolution.
- Keep automatic `matched` precision-first. Weak but useful evidence belongs in `suggested_candidates` / review.
- Do not write tokens, absolute local paths, Zotero profile paths, or complete note HTML into fixtures.

## Workflow

### 1. Extract Fixture

Run from the repository root:

```powershell
uv run --project="$HOME/.ar" --locked -- python .agents/skills/synthesis-reference-resolution-harness/scripts/extract_fixture.py --db "D:/Workspace/Artifact/Zotero-Skills/Zotero_data/zotero-agents/state/zotero-agents.db" --out "test/fixtures/synthesis-reference-resolution/current-library-vN"
```

This writes:

- `metadata.json`
- `library.json`
- `references.json`
- `gold-labels.draft.json`
- `danger-pairs.json`

Rename or promote the reviewed draft to `gold-labels.json` only after semantic review.

### 2. Review Gold Labels

Read `references/gold-labeling.md` before editing gold labels. Every reference instance must receive exactly one label:

- `match`
- `suggested_match`
- `ambiguous`
- `external_or_missing`
- `ignore`

Dangerous near-neighbor pairs must stay explicit in `danger-pairs.json`.

### 3. Build Trusted CiteKey Review Labels

When the Zotero references notes contain old reference matching workflow citeKeys, use them as trusted positive evidence before semantic review:

```powershell
uv run --project="$HOME/.ar" --locked -- python .agents/skills/synthesis-reference-resolution-harness/scripts/build_trusted_citekey_gold.py --db "D:/Workspace/Artifact/Zotero-Skills/Zotero_data/zotero-agents/state/zotero-agents.db" --fixture "test/fixtures/synthesis-reference-resolution/current-library-vN" --out-labels "gold-labels.trusted-citekey.review.json" --report "artifact/synthesis_reference_resolution_trusted_citekey_gold_review_YYYYMMDD.md" --summary "artifact/synthesis_reference_resolution_trusted_citekey_gold_review_YYYYMMDD.json"
```

This script does not overwrite `gold-labels.json`. It writes a review seed where uniquely mapped trusted citeKeys become `match`, unmapped citeKeys become `suggested_match`, ambiguous citeKeys become `ambiguous`, and rows without trusted citeKeys remain pending semantic review as `external_or_missing`.

### 4. Build Interactive Review Seed

Generate `review-seed.json` before launching the review UI:

```powershell
npx tsx .agents/skills/synthesis-reference-resolution-harness/scripts/build_review_seed.ts --fixture "test/fixtures/synthesis-reference-resolution/current-library-vN"
```

The seed contains solid confirmed edges for high-precision evidence and dashed candidate edges for review. It never overwrites `gold-labels.json`.

### 5. Launch Review UI

```powershell
npx tsx .agents/skills/synthesis-reference-resolution-harness/scripts/serve_review.ts --fixture "test/fixtures/synthesis-reference-resolution/current-library-vN"
```

Open the printed local URL. The UI reads `review-seed.json`, saves decisions to `review-state.json`, appends `review-log.jsonl`, and exports `gold-labels.reviewed.json`.

### 6. Validate Fixture

```powershell
npx tsx .agents/skills/synthesis-reference-resolution-harness/scripts/validate_fixture.ts --fixture "test/fixtures/synthesis-reference-resolution/current-library-vN"
```

Validation must pass before evaluating policies.

### 7. Run Experiment Matrix

```powershell
npx tsx .agents/skills/synthesis-reference-resolution-harness/scripts/evaluate_fixture.ts --fixture "test/fixtures/synthesis-reference-resolution/current-library-vN" --report "artifact/synthesis_reference_resolution_experiment_report_YYYYMMDD.md"
```

The script prints a single JSON object and optionally writes a Markdown report.

Use `--labels gold-labels.reviewed.json` after a human review pass.

### 8. Change Matcher Rules

After reviewing metrics, change `src/modules/synthesis/referenceMatcher.ts` or its integration points. Then rerun:

```powershell
npx mocha "test/core/151-synthesis-reference-resolution-matcher.test.ts" --require tsx --require test/setup/zotero-mock.ts --exit
npx tsc --noEmit
```

For registry behavior, also run the literature registry/citation graph tests.
