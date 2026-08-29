## 1. Migration governance

- [x] 1.1 Add a dedicated Rust migration plan that records the frozen Node baseline, target topology, workstream order, compatibility boundaries, cutover gates, deletion scope, and hard package-size budgets.
- [x] 1.2 Define the follow-up OpenSpec change sequence so that contract, engine, persistence, runtime, and cutover work remain independently reviewable.

## 2. Existing planning artifacts

- [x] 2.1 Update the Stage 1 refactor plan with a dated supersession rule: WS0-WS5 remain historical implementation evidence, while Node WS6/WS7 and Node release work are paused and replaced by Rust parity and native cutover.
- [x] 2.2 Append a dated addendum to the WS5 self-review without rewriting its original findings, recording the packaging evidence and the Rust pivot.

## 3. Active architecture documentation

- [x] 3.1 Update the Synthesis documentation index and runtime/rebuild guide to distinguish the current frozen Node oracle from the approved native Rust target.
- [x] 3.2 Update sidecar packaging documentation with the five-target Node prebuild measurements, rejected distribution models, native manifest v2 direction, and hard size gates.
- [x] 3.3 Update persistence/runtime ownership documentation so executable-state semantics remain stable while Node-specific paths are replaced at native cutover.

## 4. Validation

- [x] 4.1 Audit the touched artifacts for stale statements that still present Node WS6/WS7, formal Node XPI packaging, or Rust benchmark fallback as the active route.
- [x] 4.2 Run Markdown formatting checks, `git diff --check`, and strict OpenSpec validation.
