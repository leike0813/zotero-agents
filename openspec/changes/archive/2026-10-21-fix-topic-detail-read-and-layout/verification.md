# Verification

## Root causes and changes

Topic application writes accepted a resolver with omitted selector arrays and Concept evidence/relations represented as strings. `TopicRecord` reads required complete selector arrays and object-only Concept entries. The same successfully committed Topic consequently failed detail reads first with `repository_topic_resolver_invalid`, then with `repository_topic_projection_invalid` when the resolver alone was corrected in a diagnostic copy.

The shared resolver normalizer now serves admission, stored reads and legacy import. Patch omission retains inheritance. Concept evidence/relations use matching text-or-structured unions in contract-set, TypeScript and Rust; values remain unchanged, structured objects remain closed, and relation prose is not converted into Concept identities.

The independent layout failure came from an implicit automatic grid column in `.topic-detail`. A multi-decade timeline widened the Reader beyond the viewport and moved its centered body off-screen. One explicit `minmax(0, 1fr)` column contains it while preserving timeline scrolling.

## Red / green evidence

- Native production route: `npx --no-install tsx node_modules/mocha/bin/mocha tests/synthesis/239-synthesis-topic-mutations.test.ts --require tests/setup/zotero-mock.ts --grep 'reads sparse Topic resolvers' --timeout 120000 --exit` failed at the detail read before normalization and passed afterward. The case also verifies patch inheritance and reads a pre-existing sparse stored record after reopening.
- Concept route: the same runner with `--grep 'preserves text and structured Concept'` failed before the union change and passed afterward. List/context/detail/reopen preserve mixed metadata, and malformed primitive or structured entries remain rejected by the public list rebuilder.
- Browser: `npm run test:literature-deep-reading:detr-visual -- --grep "hosted topic reader"` failed before the CSS fix: Reader right edge was 5268px in a 1200px viewport. The hosted/export selection passed afterward at 1200×800 and 800×900, including section switching and actual timeline scrolling.

## Completed checks

| Check | Result |
| --- | --- |
| `cargo +nightly-2026-07-25 build --locked --manifest-path rust/synthesis-sidecar/Cargo.toml -p synthesis-sidecar` | Passed |
| Full `239-synthesis-topic-mutations.test.ts` with the production-route runner | 18 passed |
| `cargo +nightly-2026-07-25 test --locked --manifest-path rust/synthesis-sidecar/Cargo.toml -p synthesis-application topic::tests -- --nocapture` | 18 passed |
| `220-synthesis-native-client-composition` and `260-synthesis-reader-region` with the same Node runner | 60 passed |
| `npm run test:literature-deep-reading:detr-visual` | 12 passed, 2 existing sample-dependent cases pending |
| Root, synthesis-contracts and Synthesis page TypeScript checks | Passed |
| `npm run check:synthesis-contracts` | Passed, including canonical validator freshness |
| `npm run check:synthesis-topic-workbench-surface-parity` | Passed: 21 operations / 21 observables |
| Rust application Clippy with `-D warnings` and workspace rustfmt check | Passed |
| Changed-file ESLint, Prettier and `git diff --check` | Passed |
| `openspec validate fix-topic-detail-read-and-layout --strict` | Passed |

## Isolated real-library acceptance

A fresh read-only SQLite backup and copied canonical tree were staged under `.scaffold/test`; no diagnostic database edits were carried into this acceptance input. The source-built real sidecar returned ready detail for all six materialized Topics. TypeScript client reads retained all saved Concept metadata in Topic lists. The newly created Topic returned 24 sources; the historical Topic with the blank body returned 20.

The current-source page bundle and production CSS rendered both reported Topics in a real browser at 1380px and 800px widths. Every body was inside its Reader and viewport, with non-empty content and no page exceptions. The historical long timeline remained horizontally scrollable. The source canonical tree's 211 files were unchanged, and the original sparse resolver and text metadata remained present in the read-only source database.

## Coverage and remaining findings

`npm run check:synthesis-cross-language-contracts` found no contract errors or structure execution violations, but exited 1 because coverage is incomplete. A diagnostic rerun saved the full report under ignored `.scaffold/test` and confirmed these axes:

| Axis | Covered / total |
| --- | --- |
| Protocol entries | 483 / 483 |
| Recursive structure | 14430 / 14710 |
| Cross-language messages with complete execution evidence | 3 / 483 |
| TypeScript receiver structure execution | 9743 / 9951 |
| Rust receiver structure execution | 8 / 5903 |
| Workflow producer execution collected by this check | 0 / 10 |

The targeted native route and workflow tests above are separate evidence; they do not establish complete protocol coverage.

Broader real-library probing found an independent existing audit-context rejection in five historical Topics at `/audit/current_metadata/prospective_topic_relation_proposals/0` (`additionalProperties`). Their detail and list reads pass. The newly created Topic's audit context also passes. That historical audit DTO mismatch is recorded, not changed by this detail/layout fix.

No plugin build, XPI installation, Zotero System End-to-End run, dependency change, commit, push or publication was performed. Browser replay is not Zotero process acceptance. Private diagnostic copies and screenshots remain ignored under `.scaffold/test`.
