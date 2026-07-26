## Context

The Replay publication sidecar listens on the active Assistant Workspace child window while the shell forwards a forced host snapshot into that child. Its current source filter compares the child `MessageEvent.source` to a shell `Window` captured from the privileged host realm using strict identity. In Zotero, the nested chrome frame boundary can omit `event.source` or expose the same browsing context through a different Xray/`wrappedJSObject` representation. The sidecar then silently ignores an otherwise matching newer revision, so both non-closed surface preparations time out.

The prior child-owned drain-id acknowledgement tolerated this boundary but left Replay state and actions in normal render paths. The fix must retain the new debug-exclusive architecture and production zero-residue guarantee.

## Goals / Non-Goals

**Goals:**

- Accept valid ACP Chat and ACP Skills publication evidence across Zotero window wrappers.
- Continue rejecting a demonstrably unrelated non-null publisher.
- Preserve newer-revision, expected-tab, captured-child, render-frame, cancellation, and cleanup checks.
- Lock the real nested-frame behavior with a Zotero runtime regression test.

**Non-Goals:**

- Restoring drain ids, child Replay actions, Workspace wait maps, or hot-path hooks.
- Changing matrix ordering, surface selection, synthetic owners, result formats, or production build governance.
- Adding dependencies or changing backend and persistence contracts.

## Decisions

### Missing source is unverifiable, not invalid

The sidecar will reject only when both the observed and expected publisher are present and can be shown to represent different browsing contexts. A missing `event.source` will proceed to the existing tab, message type, revision, child identity, and rAF checks. Removing publisher validation entirely was rejected because non-null unrelated sources remain distinguishable at no hot-path cost.

### Window equivalence is Xray-aware and local to the sidecar

A small safe helper in the debug-exclusive sidecar will compare direct identity and the available direct/`wrappedJSObject` combinations. Access to `wrappedJSObject` will be guarded because cross-compartment property access can throw. The helper will not be added to shared Workspace utilities: this compatibility rule belongs to Replay publication and must disappear with the exclusive module.

### Tests exercise the production-shaped branch first

The existing fake window will carry a message source, and success cases will always supply `publisherWindow`, preventing the source filter from being bypassed. Table-driven cases will cover absent, direct, wrapped-equivalent, and unrelated sources. A Zotero-only runtime test will use the real Assistant Workspace shell and nested child frames, force Chat and Skills snapshots, await render confirmation, then restore Workspace state. Controller/profiler mocks remain useful for matrix behavior but are not evidence for WindowProxy interoperability.

## Risks / Trade-offs

- [A source-less unrelated synthetic message could match] → The listener exists only during debug replay on the captured child window and still requires the exact message type, target tab, strictly newer revision, stable child identity, and render frame.
- [Reading `wrappedJSObject` throws] → Treat inaccessible wrappers as unavailable and fall back to direct identity without failing the publication listener.
- [The Zotero runtime test leaves UI state behind] → Snapshot the prior Workspace state and use `finally` cleanup/restoration.
- [The fix regresses production isolation] → Keep all comparison code inside the exclusive sidecar and rerun the real-entry release-elision gate.

## Migration Plan

1. Add failing production-shaped source tests and the Zotero nested-frame regression.
2. Implement Xray-aware optional source validation in the sidecar.
3. Run Replay, Workspace, release-elision, type, lint, and OpenSpec validation.

No data migration or compatibility layer is required. Rollback is a source revert of this change; stored traces and matrices are unchanged.

## Open Questions

None.
