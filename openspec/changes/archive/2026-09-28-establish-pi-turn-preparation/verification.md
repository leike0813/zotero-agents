# C06 verification

Status: implementation complete; OpenSpec task progress **5/5**. The capability spec was synced and the change archived on 2026-09-28. The user explicitly accepted the C06 targeted tests as an archive-gate exception after withdrawing the request to repair full suites first. The full-suite failures below remain open and are not represented as passes.

## Evidence

| Check | Result |
| --- | --- |
| Shared Node test, `tests/runtime/247-pi-turn-preparation.test.ts` | 14 passed. The first test was red before the module existed; the long-history case was red before bounded batch compaction; the durable-record basis test was red before the CAS fix. |
| `npm run test:node -- --shard runtime-provider-execution` | Passed, 7 files, including C04 `246` and C06 `247`. Both are now assigned in `scripts/run-node-test-shards.ts`. |
| `ZOTERO_TEST_GREP='Pi Turn Preparation' npm run test:zotero:core` | Passed on real Zotero, 15 cases including the no-Node host check, after the durable-record basis fix. |
| `./node_modules/.bin/tsc --noEmit` | Passed after the durable-record basis fix. |
| `npm run lint:check` | Passed after final source changes. |
| `npm run build` | Passed after final source changes; generated help-docs timestamp was restored to its pre-build value. |
| `openspec validate establish-pi-turn-preparation --strict` | Passed. |
| `git diff --check` | Passed after archive and final handoff update. |

## Spec and design review

- **Completeness:** 5/5 capability requirements have implementation evidence; 5/5 tasks are checked. Shared tests exercise active-path projection, trusted resources, budget admission, durable records and compaction through `preparePiTurn`.
- **Correctness:** The module records evidence before ordinary and each compaction Provider-facing callback, excludes credential refs and absolute user paths from records, preserves the current turn input, validates summaries before CAS, and leaves selection unchanged on stale/failing CAS. Long old histories use bounded summary batches with a single final CAS. Record append returns the current transcript basis so the CAS remains valid when canonical evidence itself appends to the transcript. No native Pi or Node runtime object is imported.
- **Coherence:** C02 transcript and CAS ownership, C03 model selection, and C07 tool-catalog ownership remain separate. The production CAS/estimator/summarizer adapter belongs to later Conversation and Skill Run wiring; this change tests their injected interface with deterministic callbacks.

## Full-suite gate exception and outstanding failures

1. `npm run test:node:runtime` failed in pre-existing `tests/runtime/239-runtime-host-adaptation-governance.test.ts` at Mocha's default 2-second timeout. A standalone rerun of its `runtime-platform-persistence` shard reproduced that failure. The full runtime command then stopped making progress in the unrelated `runtime-provider-products` shard and was interrupted. C06's `runtime-provider-execution` shard passed independently.
2. `timeout --signal=INT --kill-after=10s 180s npm run test:zotero:core` exited 124 after the library page query cases, the same full-suite bottleneck recorded by prior Pi changes. The full run occurred before the final bounded-batch implementation; the latest C06 cases passed in the real host afterward. No full-core pass is claimed.

The user withdrew the decision to fix these full gates first and explicitly accepted the passing C06 targeted Node shard and real Zotero cases as the archive gate. The failures remain follow-up work; no full runtime or core pass is claimed.
