## Why

The default Synthesis client currently lacks a generation-scoped lifecycle: concurrent acquisition can duplicate compositions, invalidated initializers can republish stale clients, and disposed legacy clients can recreate services through the global resolver. Plugin shutdown also does not await the timers and WebDAV work owned by those compositions, leaving stateful work alive past its owner.

## What Changes

- Make default-client acquisition share one initialization per generation and fail closed when that generation is invalidated.
- Give each legacy composition an owner-scoped, idempotent asynchronous disposal path that cannot affect a replacement generation.
- Add internal service disposal that cancels maintenance debounce state, stops WebDAV admission, and drains active WebDAV application work without changing the public service inventory.
- Add an idempotent default-client shutdown barrier and invoke it before stopping the sidecar supervisor during plugin shutdown.
- Extend lifecycle, service, and shutdown tests to lock the new concurrency and cleanup guarantees.

## Capabilities

### New Capabilities

- `synthesis-default-client-lifecycle`: Defines generation-scoped acquisition, invalidation, disposal, and plugin-shutdown guarantees for the default Synthesis client composition.

### Modified Capabilities

None.

## Impact

The change affects `src/modules/synthesisClient/defaultClient.ts`, `src/modules/synthesisClient/legacyComposition.ts`, `src/modules/synthesis/service.ts`, `src/hooks.ts`, and focused core tests. It preserves the public `SynthesisClient` contract, DTOs, RPC/storage formats, production routing, dependency set, and the 108-method Synthesis service surface.
