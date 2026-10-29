# Tasks

## 1. Notification correctness

- [x] 1.1 Correct optional echo request and native receipt adaptation; native-composition observer regressions pass.
- [x] 1.2 Tag column-only repaint and exclude it from Index invalidation and echo reads; existing column/lifecycle behavior tests pass and invalidation documentation describes the distinction.

## 2. Measured Index rows

- [x] 2.1 Window parent and expanded reference rows together, preserve anchors/focus and append position, and avoid zero-reference hydration; existing windowed-row tests plus expanded-scroll regressions pass.

## 3. Native pages and details

- [x] 3.1 Extend closed Workbench request/result contracts and corpora for paging/basis/targeted details; positive/negative contract checks pass.
- [x] 3.2 Implement bounded Index pages, filtered referenced batches, source-only hydration, and basis rejection; native Reference Application tests verify read shapes and failure semantics.

## 4. Workbench progressive session reads

- [x] 4.1 Publish first batch before serial continuation, append at most 100 rows, stop stale/hidden/disposed work, and preserve last-good content on failure; host behavior tests pass.
- [x] 4.2 Retain complete/partial Index data across closure within four entries / 8 MiB, invalidate across data/service changes, and reuse loaded references; host cache and hydration tests pass.
- [x] 4.3 Update invalidation/performance documentation and project constraints for progressive session ownership; documentation matches final behavior.

## 5. Integration acceptance

- [x] 5.1 Run affected Node/Rust tests, TypeScript and cross-language contract checks; all required checks pass.
- [x] 5.2 Extend and run the existing current-source Zotero E2E path for Index first batch, expansion and scrolling; report real-process acceptance or an explicit environment blocker without claiming unrun validation.

## Validation evidence (2026-10-07)

- Affected Node suites: 215 passing across 125, 176, 218, 220, 252, 257 and UI 48.
- Rust: 11 `synthesis-application` Workbench tests and 9 `synthesis-protocol` tests passing; application Clippy and formatting checks pass.
- Root and Synthesis TypeScript checks, affected-file ESLint, cross-language contracts and Workbench/native runtime parity checks pass.
- `ZOTERO_TEST_GREP=PA-02 npm run test:zotero:e2e`: 1 selected, 1 passed on Linux Zotero 10.0.2 with the current-source local sidecar. Covers a 25-source summary page, targeted details, and bounded scrolling through 60 expanded references. Receipt: `artifacts/test-diagnostics/system-e2e/21f5f994-d724-45ee-b277-ca69f71ec788/run-manifest.json`.
- Real-library cold-load timing, Windows, and Zotero 7/9 were not measured in this acceptance run.
