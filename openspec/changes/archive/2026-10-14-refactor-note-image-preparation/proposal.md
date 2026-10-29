# Proposal

## Why

Representative image preparation can wait forever after selecting the document of a closed preferences window, leaving an otherwise completed literature analysis running. Image conversion needs an owned execution lifetime independent of UI windows.

## What Changes

- Replace DOM/window image conversion with one disposable ChromeWorker per image using ImageBitmap and OffscreenCanvas.
- Give each preparation a 30-second total budget, caller cancellation, scope disposal, and plugin shutdown cleanup; reject late success.
- Keep the existing prepared-image DTO, opaque refs, byte limits, preservation mode, and atomic note transaction.
- Skip optional image failures while propagating cancellation; remove unused legacy conversion interfaces.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-host-api-v12`: bounded image preparation and run-owned cancellation and cleanup.
- `literature-digest-representative-image`: bounded best-effort preparation before one atomic note commit.

## Impact

Workflow image owner, platform worker, Workflow Host composition, plugin build/shutdown, representative-image workflow helper, and their existing test facilities. No new dependency, public API version, or persisted-data migration.
