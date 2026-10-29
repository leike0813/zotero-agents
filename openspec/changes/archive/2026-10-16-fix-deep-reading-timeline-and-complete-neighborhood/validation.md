# Validation

## Regression evidence

The application neighborhood regression initially rejected the unknown `depth` field. Shared layout initially returned three coordinates for a four-node graph, omitting the single-source external reference. Topic lookup initially omitted the source-only Topic. Runtime tests initially omitted a neighborhood external node and returned an empty current-paper focus. Each regression passed after its corresponding fix.

## Checks

- `cargo +nightly-2026-07-25 test --locked --manifest-path rust/synthesis-sidecar/Cargo.toml -p synthesis-application -p synthesis-repository`: 181 application and 68 repository tests passed.
- `cargo ... -p synthesis-sidecar runtime_citation_graph`: 7 tests passed, including production layout promotion and layout-version readiness.
- `cargo ... -p synthesis-citation-layout`: 5 tests passed.
- `cargo ... build -p synthesis-sidecar`: current-source local executable built successfully.
- `cargo ... clippy --workspace --all-targets -- -D warnings` and workspace `fmt --check`: passed.
- Production RPC test `reads available persisted coordinates only when stale layouts are allowed`: passed, including old coverage version, one/two-hop slice-layout identity, and maximum 100/200 request bounds.
- Shared visual-rule and deep-reading workflow tests: 19 passed.
- `npm run test:literature-deep-reading:detr-visual`: 10 passed; 2 older full-DETR sample tests skipped because their optional fixture is absent. Real generated artifacts were checked separately below.
- Main and Synthesis TypeScript checks; Synthesis engine/contracts/application/repository checks; modified TypeScript ESLint; Prettier; cross-language contracts; Citation Graph surface parity; strict OpenSpec validation; `git diff --check`: passed.

## Tooling environment limitation

The complete `tooling-deep-reading` shard ran with one failure: its deterministic-package test rebuilds source bundle files that Windows reports as having an open user-mapped section. An isolated rerun reproduced that exact OS failure. No product assertion failed in the shard. Four focused runtime/collection/layout tests passed independently.

To verify the blocked assertion, an isolated source snapshot generated the complete Skill twice. All 23 files were byte-identical between generations and equal to the workspace built-in Skill. The source generator was not changed to work around the host file lock.

Browser checks used the installed Chromium headless shell 1243 through a temporary Playwright cache junction for expected revision 1223; no browser was downloaded, and the junction was removed after verification. This is browser contract-integration evidence, not a Zotero System End-to-End test.

## Isolated real-artifact acceptance

SQLite backup copied the original Synthesis state consistently into an ignored local acceptance directory. Canonical Topic content and the three reported run workspaces were copied there. The current-source production sidecar regenerated shared force coordinates through its existing public maintenance operation. Production Topic/context/slice/layout RPC results then fed the existing Python preface/final renderer using copied run data.

| Reported artifact | Topic candidates | Timeline items | Two-hop nodes | External nodes | Coordinate coverage | Truncated |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 2009 paper | 1 | 25 | 18 | 14 | 18/18 | No |
| 2018 paper | 2 | 11 | 80 | 63 | 80/80 | Yes, 80-node acceptance cap |
| 2020 paper | 1 | 32 | 20 | 19 | 20/20 | No |

The two-candidate case selected the Topic closest to the paper's reading objective. Every regenerated artifact retained its correct portable current-paper identity. Chromium loaded the three timelines and standalone WebGL canvases without page errors; screenshots confirm the formerly missing external nodes are visible.

Local evidence, regenerated HTML, screenshots, and temporary acceptance drivers are under `artifacts/test-diagnostics/deep-reading-regressions/2026-10-16/` and remain ignored. No original database, canonical Topic, run workspace, or stored HTML attachment was modified. No plugin/XPI was built or installed and no publication or Git commit was performed. Packaged delivery still requires build preflight and governed runtime/content synchronization.
