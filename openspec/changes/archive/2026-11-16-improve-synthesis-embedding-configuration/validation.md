# Validation

## Automated evidence

- Combined focused run of UI 40, provider 283, preferences 284, and Home 285: **104 passing, 2 pre-existing pending**. The pending cases concern runtime default resolution and context-menu `openDashboard`, not embedding configuration. The model filter is covered within the discovery UI case.
- `npm run test:node -- --shard synthesis-workbench`: **272 passing**, 31.6 seconds; `--shard synthesis-application`: **181 passing**, 41.5 seconds. Subsequent save-concurrency and stale-probe cases passed in focused runs.
- `tsc --noEmit` and `tsc --noEmit -p tsconfig.synthesis.json`: passed.
- `npm run check:synthesis-contracts`: passed, including canonical-literature validator freshness.
- Rust `synthesis-application retrieval`: **31 passing**; `encoding_`: **4 passing**. Rust formatting check passed.
- Rust production embedding-result decoder: **1 passing**. The production decoder test group in test 218: **43 passing**, including **121 retrieval request cases** and **92 embedding Host result cases**.
- Retrieval shared corpus: **47/47** admitted/rejected as declared.
- Targeted ESLint, Prettier, localization governance for all 11 locales, and `git diff --check`: passed.
- OpenSpec change strict validation passed after shortening requirement summaries; both main capability specs are synchronized. Repository spec validation: **376 passed**.

Tests use controlled HTTP responses, synthetic vectors, preference storage and fake DOM. No production service credential or live embedding endpoint was used.

## Incomplete aggregate checks

The standalone cross-language checker returned `ok: false` with an empty protocol-error list. Its full coverage/evidence ledger is incomplete for the current source identity, including unrelated capabilities and workflow producers. Production decoder tests above passed, but they do not establish a green full aggregate. Source/test edits invalidate execution-evidence identities; no historical receipt was relabeled as current.

## Packaging and host acceptance

`check:synthesis-sidecar-runtime-freshness` failed with `build_fingerprint_mismatch` for all seven targets. The installed package set has fingerprint `36668dbf295a4af923adef50aaedd1eeb2a74c739f85ba4ed22fed96221e4c22`; the checked source required `0c00a9ece966498fd150b0946c45ed2dacd7f64f40ab11ac1d10f19069136f6b`.

No XPI was built, no native package was replaced, and no real Zotero or live-provider acceptance was run. These require an authorized pushed source and new seven-platform prebuild before the existing build-preflight and unified Zotero acceptance runner can proceed. No commit, push, publication, or dependency change was performed. Task 7 remains open.
