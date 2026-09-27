# Design

## Context

The accepted Wayfinder [runtime boundary](https://github.com/leike0813/zotero-agents/issues/14) places transient Agent execution behind one project module. The [C01 plan](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5520989998) limits this change to a faux turn and defers owner persistence, real provider selection, tools, and UI. Existing tests live under `tests/`, with Zotero core-lite discovery in `zotero-plugin.config.ts` and Node shard selection in `scripts/run-node-test-shards.ts`; the older ticket paths are stale.

## Goals / Non-Goals

**Goals:** Make session/turn lifecycle and normalized observation usable by both future owner types; prove native Pi runs in the current Zotero browser build.

**Non-Goals:** Product owner records, history storage, provider credentials, tool dispatch, Assistant Workspace publication, startup recovery, concurrency governance, or production faux provider.

## Decisions

1. **One deep `PiRuntime` module.** Keep native `Agent`, `pi-ai` stream types, subscription, abort, and event conversion inside `src/modules/piRuntime.ts`. Callers see opaque live handles and project-owned DTOs. This avoids an adapter hierarchy whose only implementation would be native Pi.
2. **Small session interface.** `openSession` creates a transient session; `runTurn` accepts prepared low-level input and returns an event stream, authoritative result promise, and abort operation; `dispose` cleans up idempotently. A busy session rejects the second turn. No runtime-owned durable session entity or reset API is introduced in C01.
3. **One internal stream injection seam.** The deterministic fixture supplies a native faux model stream through a module-internal dependency slot. The public DTO surface never includes native SDK model or provider values. Future provider execution fills this slot without changing turn ownership.
4. **Single event pump and terminal gate.** Normalize SDK events in source order, assign session/turn identity and monotonic sequence, and settle one terminal result. Abort closes publication to ordinary late events; subscription cleanup and session disposal occur even on failure. A native exception becomes a bounded structured failure.
5. **Current browser build first.** Pin native core and `pi-ai` to matching `0.84.4` versions. C01 imports only the core and faux-test path, using existing Firefox 115 bundling and a real-Zotero test. Do not add a separate build script or a broad Node shim. The exact `provider-env.js → node:fs` guard belongs only to a build that actually reaches that provider import.

## Risks / Trade-offs

- **Native event shape changes on upgrade** → exact version pins and normalized behavior tests catch changes before a pin is moved.
- **Cancellation is logical before the native stream settles** → reject late observations and keep a unique terminal; physical teardown and unknown-effect policy are later lifecycle work.
- **C01 has no production caller yet** → the real-Zotero test imports the production module directly, and later changes reuse the same interface rather than a test-specific implementation.
