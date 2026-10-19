# Verification

## Baseline and failure

Main repository baseline: `29223d3e8`. Literature-analysis pinned source: `5748a71ed2acb6614c071e0ddc81a6ad6bcf969c`.

The October 13 runtime transcript records a successful edit to the old shared catalog's matching-metadata schema. The October 19 dev.4 installation caused a newly materialized catalog to consume the uncorrected source schema. The old and new catalogs had identical literature-analysis registry checksums; the changed catalog identity also reflected other Skill changes. Runtime cache edits are not a source or delivery fix.

The new public CLI regression runs `finalize_outputs` on synthetic persisted state. Before the schema correction, the full-artifact test fails with `citation_report_failed` and missing required `literature_matching_metadata`; score-only rendering succeeds. This reproduces the upstream cause of the reported empty artifact paths without reading or mutating the user's library or failed run.

Command:

```text
uv run --project C:/Users/leike/.ar --locked -- python -B -m unittest discover -s skills_builtin/literature-analysis/tests -p test_citation_materialization.py -k renders_full_artifacts
```

Result before correction: one test, one failure. The companion `-k score_only` command passes one test.

## Correction and current checks

The sole production edit promotes the existing inner matching-metadata schema to its root. A one-time structural comparison against the pinned schema confirmed that the corrected schema equals the former inner object exactly, including all literals, required fields, item types, array limits and unknown-field rejection. The renderer, templates, workflow mappings, protocol schemas and TS/Rust implementations have no diff.

Both regression seams were red before correction and green afterward:

- Public CLI: the full-artifact test failed at the same missing-wrapper validation as the user's run; after correction, all five Python tests pass. These cover full artifacts and mirror equality, 11 parameterized invalid metadata cases, score-only rendering, and the two existing Citation materialization cases. Fixtures use temporary synthetic state only.
- Fresh catalog/native apply: the targeted existing real-sidecar test failed before RPC because copied source schema rejected the bare fixture. After correction it passes (one test, 2.4 seconds), including rebuilding after a temporary auxiliary Skill change, invalid artifact rejection, the unchanged wire identifier mapping, nonempty References/Citation, four managed-note outputs and reopen idempotency.

Commands:

```text
uv run --project C:/Users/leike/.ar --locked -- python -B -m unittest discover -s skills_builtin/literature-analysis/tests -p test_citation_materialization.py
tsx node_modules/mocha/bin/mocha tests/workflow-literature-analysis/21-workflow-literature-analysis.test.ts --require tests/setup/zotero-mock.ts --timeout 10000 --grep "persists a literature-analysis digest apply through the real sidecar"
```

- `npm run check:synthesis-contracts`: passed, including canonical validator freshness.
- Full `21-workflow-literature-analysis.test.ts` Mocha run, same setup and timeout without `--grep`: 41 passed, eight existing pending cases; skipped cases are not counted as executed coverage.
- `npm run test:node -- --shard workflow-packages-literature`: passed, ten files, including sequence apply, mock E2E and adjacent literature workflows.
- `npm run test:node -- --shard workflow-packages-workbench`: passed, four files.
- Targeted Mocha run of `177-synthesis-workflow-client.test.ts` and `45-workflow-note-import-export.test.ts`: 52 passed, including real native import and wire artifact projection.
- Targeted Mocha run of canonical literature and score contract files 270/272: 13 passed.
- `tsc --noEmit`: passed.
- Prettier check of the modified TypeScript, JSON and change documentation; ESLint on the modified TypeScript; Ruff on the modified Python: passed.
- Main-repository and submodule `git diff --check`: passed.
- `openspec validate fix-literature-analysis-matching-artifact-rendering --strict`: passed.

## Boundaries

Local finalization synchronizes the single added requirement and its four scenarios into the existing `literature-workbench-workflows` spec, preserving its previous content. Main-spec validation reports 372 passed and zero failed, with existing repository warnings; this change also passes strict validation. The completed change is archived with the parent commit and corrected gitlink.

These checks do not establish complete recursive protocol coverage or a complete live Zotero/Agent workflow run. The recent parity change's wire schemas, production TS/Rust codecs and archived evidence remain unchanged. The user subsequently authorized local commit and cleanup: the corrected Skill and its tests are committed as `c5951a302ef052dee67f8acec2ca570eda4b7851`, and the parent gitlink records that identity. Remote push, content publication, plugin build and user installation remain outside this cleanup; installed content is unchanged until governed delivery.
