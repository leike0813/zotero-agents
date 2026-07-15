## 1. Lock production-isolation failures

- [x] 1.1 Extend the release-elision test to fail on the missing Trace/Replay/SkillRunner exclusive modules and forbidden runtime markers in real non-debug entry output while preserving exact static Dashboard allowances.
- [x] 1.2 Replace Replay acknowledgement smoke assertions with failing source-protocol assertions that all three normal child render paths contain no drain property or action.
- [x] 1.3 Add failing publication-sidecar tests for render-after-rAF success and stale revision, wrong tab, timeout, abort, frame replacement, and unload cleanup.

## 2. Establish the build manifest SSOT

- [x] 2.1 Add one runtime diagnostics production-isolation manifest containing feature switches, exclusive modules, forbidden executable markers, and narrow static allowlists.
- [x] 2.2 Refactor the diagnostics esbuild plugin, plugin build configuration, and release-elision checker to consume the manifest and remove duplicated local lists.
- [x] 2.3 Verify real-entry non-debug module bytes and markers, source-disabled debug elision, auxiliary source-on/off equality, and retained allowlisted static templates.

## 3. Elide ACP Trace hot-path residue

- [x] 3.1 Gate adapter Trace context access and every semantic recorder call so non-debug/source-disabled builds retain no arguments, property reads, or no-op calls.
- [x] 3.2 Gate Chat session and Skills orchestrator/store owner/context construction together with recorder invocation using the compile-time debug and source switches.
- [x] 3.3 Run semantic Trace and ACP session/orchestrator focused tests and confirm trace-exclusive production inputs contribute zero bytes.

## 4. Isolate Replay synthetic and publication seams

- [x] 4.1 Replace the broad Skills store namespace dependency with a narrow debug-exclusive dynamic synthetic facade.
- [x] 4.2 Implement the debug-exclusive Replay publication sidecar and cold Workspace diagnostics port with tab/revision/window filtering, render-frame confirmation, and idempotent terminal cleanup.
- [x] 4.3 Remove Workspace host Replay nonce/maps/waiters, generic snapshot drain injection, profile-context residue, acknowledgement action handling, and legacy drain polling.
- [x] 4.4 Remove Replay drain property reads/actions from Chat, ACP Skills, and SkillRunner child scripts without adding hooks to normal render queues.
- [x] 4.5 Run sidecar, Replay controller/profiler/logical-time, Workspace DOM identity, and UI source-protocol tests.

## 5. Complete governance and verification

- [x] 5.1 Update current-state debug mode, ACP Trace & Replay/performance-profiler, and testing-framework documentation with the manifest gate and sidecar boundary.
- [x] 5.2 Run SkillRunner governor, Dashboard/Host Bridge, Recorder, and release-elision regressions.
- [x] 5.3 Run the relevant TypeScript typecheck and lint commands, validate the OpenSpec change, and record any unavailable checks or remaining risks.
