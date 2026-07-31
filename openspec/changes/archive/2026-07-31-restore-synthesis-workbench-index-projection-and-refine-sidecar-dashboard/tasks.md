## 1. Contracts and Regression Baseline

- [x] 1.1 Add production-route coverage for current-library Index rows, cache readiness, repeated UI reads, expanded references, and ready empty libraries
- [x] 1.2 Add browser UI coverage for event status badges, structured detail, and copy success/failure feedback

## 2. Native Workbench Projection

- [x] 2.1 Add bounded scoped repository reads and one typed current-library Reference Index fact projection
- [x] 2.2 Adapt the public Reference Sidecar Index without changing its operation or pagination contract
- [x] 2.3 Adapt Workbench Index and chrome to the existing `SynthesisUiSnapshotInput` fields and cache-basis semantics

## 3. Dashboard UI

- [x] 3.1 Reuse shared status badges for Sidecar summary and event rows
- [x] 3.2 Implement the summary-plus-JSON detail layout and visible clipboard feedback

## 4. Verification and Local Package

- [x] 4.1 Run focused Core/UI tests, TypeScript build, Rust fmt/clippy/tests, parity/capability/release-elision checks, strict OpenSpec validation, and `git diff --check`
- [x] 4.2 Rebuild and package only the current-platform sidecar without launching Zotero or dispatching remote workflows
