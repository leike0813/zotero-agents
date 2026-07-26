## Context

ACP Trace, Replay, runtime profiling, and SkillRunner audit instrumentation already use compile-time debug/source switches, but their release-elision policy is fragmented. `scripts/runtime-diagnostics-esbuild.ts` owns one side-effect list while `scripts/check-runtime-diagnostics-release-elision.ts` owns a second module/marker list. The two lists have drifted: semantic-trace schema and Replay identity/logical-time modules are not governed consistently, and tests can prove source-toggle equality without proving that the real production artifact is clean.

The runtime has a second isolation problem. Trace recorder bodies are gated, but callers still construct owners/contexts or read semantic update fields. Replay production ports import synthetic exports from the broad Skills store namespace. Workspace host state contains Replay nonce/maps/waiters, generic snapshots carry a drain id, child actions acknowledge it, and all three normal child render scripts branch on the Replay property. Those operations remain on ordinary Chat, Skills, and Workspace paths even when diagnostics are inactive.

The implementation must preserve the existing trace schema, replay matrix/result format, nine-run ordering, logical cadence, owner/readiness semantics, render-after-publication acknowledgement, Workspace DOM identity, and current SkillRunner governor instrumentation. Plugin-runtime code cannot depend on Node-only facilities.

## Goals / Non-Goals

**Goals:**

- Establish one build-time manifest as the SSOT for exclusive modules, side-effect classification, forbidden runtime markers, and narrow static allowlists.
- Make real non-debug entry bundles the primary release gate for both ACP and SkillRunner diagnostics.
- Compile Trace owner/context creation, property reads, imports, and calls out together with recorder implementations.
- Remove Replay/profile plumbing from ordinary Chat, Skills, Workspace snapshot/render, and timer paths.
- Preserve debug Trace & Replay behavior, including rendered publication confirmation and cleanup under failure.

**Non-Goals:**

- Removing Trace or Replay, changing their user workflow, result schemas, or storage.
- Refactoring the 22 SkillRunner governor call sites that already compile to zero production work.
- Asset splitting, persistent-data migration, backend/protocol changes, compatibility layers, or new dependencies.
- Treating static Dashboard templates, locale strings, hidden routes, or type-only DTOs as executable diagnostics.

## Decisions

### One declarative diagnostics build manifest

Create a Node-side manifest module under `scripts/` that declares feature groups, source-switch defines, exclusive source modules, forbidden executable markers, and exact static allowances. `runtime-diagnostics-esbuild.ts`, the plugin esbuild configuration, and the release-elision checker consume this module. The manifest includes semantic trace schema and all Replay identity, logical-time, profiler, target, production-port, and publication-sidecar modules.

This replaces parallel lists rather than adding a third registry. Keeping the manifest under `scripts/` ensures it is build tooling, not plugin-runtime state. A convention-only directory scan was rejected because some shared-looking modules are diagnostic-exclusive while static assets intentionally retain diagnostic labels.

### Artifact inspection is the acceptance SSOT

The checker compiles real entry points with metafiles and verifies that every manifest-exclusive input contributes zero bytes to non-debug output. It separately scans executable output for forbidden markers after applying only exact static allowances. Source-on/source-off equality remains a helpful regression signal, but cannot satisfy the gate alone.

This catches both retained module bodies and small caller residue such as property reads or empty function calls. Dashboard static source checks remain separate so an allowlisted template cannot hide an executable marker.

### Trace instrumentation uses a single foldable double gate

Every Trace caller encloses owner/context construction, trace-only semantic update access, and recorder invocation within `__debug_mode__ && ACP_RUNTIME_SEMANTIC_TRACE_SOURCE_ENABLED`. Adapter context is not computed or attached outside that gate. The recorder facade does not expose production no-op calls that would keep argument evaluation alive.

Inlining the compile-time double gate at instrumentation boundaries is intentional: a runtime helper would hide constant propagation and retain call arguments. Business projection logic remains outside the gate.

### Replay synthetic Skills access uses a narrow dynamic facade

Replay production ports stop importing the complete `acpSkillRunStore` namespace. A small debug-exclusive facade dynamically imports only the synthetic operations required by Replay. The import itself is behind the Replay double gate, allowing esbuild to remove both the facade and synthetic export reachability from production.

Moving normal store APIs into the facade was rejected because it would broaden the diagnostic boundary and risk changing production store semantics.

### Render acknowledgement moves to a debug-exclusive sidecar

A new Replay publication sidecar owns the wait protocol. Before requesting publication it obtains a cold Workspace diagnostics port containing: target readiness, target child `Window`, current snapshot revision, and a force-publication operation scoped to one tab. It registers a one-shot `message` listener on the target child before force publication, accepts only the expected tab/snapshot and a revision newer than baseline, then queues confirmation through the target child's `requestAnimationFrame`. Because the child normal render listener was registered during child initialization before Replay runs, listener registration order followed by rAF establishes render completion without adding a child hook.

Timeout, abort, child unload, target window replacement, and frame replacement all converge on one cleanup routine that removes the message/unload listeners, cancels timers and pending frame callbacks where supported, and settles once. Incorrect tab, snapshot, source window, or stale revision is ignored.

The Workspace host deletes Replay nonce, pending-drain maps, waiter maps, snapshot injection, child-action acknowledgement, and generic drain polling. The three child scripts delete drain-property reads and Replay child actions. Normal `queueRender` remains unchanged.

### The Workspace diagnostics port is cold and wholly elidable

The core Workspace exposes the narrow port only through a compile-time gated, debug-exclusive module boundary. Production code does not retain a stub method, hook, action branch, field, or profile-context lookup. Replay-side code may query readiness and revision when preparing a profile, but transcript-only snapshots continue to use region-local signatures and do not rebuild unrelated managed regions.

### Tests lock stable behavior and isolation boundaries

TDD begins with failing release-elision assertions for the missing modules/markers and failing source-protocol assertions for existing drain plumbing. Sidecar tests exercise matching render-after-rAF success plus stale revision, wrong tab, timeout, abort, frame replacement, and unload cleanup. Existing Recorder, controller/profiler/logical-time, Workspace DOM identity, SkillRunner governor, Dashboard, and Host Bridge suites remain the behavioral safety net.

Tests assert structured state, module bytes, markers, listener lifetime, and DOM identity rather than exact prose or implementation call order.

## Risks / Trade-offs

- [Manifest becomes another stale list] → Make both build side-effect handling and release verification import it; add manifest consistency validation and forbid local duplicate lists.
- [Dynamic import changes Replay setup timing] → Resolve the facade during existing out-of-profile target setup and await it before profile start.
- [Message listener observes a pre-render snapshot] → Register after child initialization, filter a strictly newer revision, and resolve only in child-window rAF after normal listener dispatch.
- [Stale frame falsely acknowledges] → Capture the child window identity and recheck it before force publish, on message, and at rAF completion.
- [Abort/timeout leaks listener state] → Use one idempotent settlement/cleanup owner across every terminal path and test listener counts.
- [Static allowlist masks runtime code] → Scope allowances to exact asset/source classes and scan compiled executable output independently.
- [Double gating is visually repetitive] → Keep the repeated gates only at hot instrumentation boundaries; the manifest remains the SSOT for feature identity, not runtime evaluation.

## Migration Plan

1. Add failing release and source-protocol tests, then introduce the shared manifest.
2. Harden Trace call-site gates and narrow Replay synthetic imports.
3. Add and verify the publication sidecar and cold Workspace port.
4. Remove host/child Replay acknowledgement residue and run focused behavior suites.
5. Update current-state documentation and run typecheck, lint, and the full diagnostics release gate.

The change requires no data migration. Rollback is a normal source revert of the change; stored traces and replay matrices remain readable because their formats do not change.

## Open Questions

None.
