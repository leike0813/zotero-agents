# Design

## Context

See proposal.md for the failure. Workflow Host v12 already provides the correct portable image request, run-scoped refs, and a trusted resolver consumed by note transactions. The implementation underneath it mixes source normalization, legacy conversion, DOM capability discovery, and registry lifecycle.

## Goals / Non-Goals

Keep portable interfaces and the existing note transaction. Eliminate UI lifetime coupling and bound every preparation. Locator policy, PDF extraction, ACP state transitions, retries, and persisted formats are outside this change.

## Decisions

- The scope owns source normalization, validation, SHA-256, byte accounting and immutable prepared records. Remove unused legacy source/options/result exports and singleton; replace old conversion tests with tests across the scope interface.
- A private platform adapter creates a packaged ChromeWorker for one request and terminates it on every terminal path. Transfer bytes in and out; the worker alone owns ImageBitmap/OffscreenCanvas and the single resize/encode policy. Worker messages and processing options have one code-native definition. Avoid a shared pool, queue, DOM fallback or new dependency.
- One scope-owned cancellation controller and 30-second total deadline cover reading, conversion and digest/registration. Caller abort, scope disposal and plugin shutdown invalidate the call. Processing abort terminates its worker. Non-cancelable reads may finish late but cannot start another stage or register content. Check liveness and aggregate bytes immediately before synchronous registration.
- Preserve JPEG/PNG source bytes when requested, decoding only to obtain dimensions. Default conversion keeps the 720px/180KiB/320KiB policy, JPEG quality steps 0.82/0.78/0.74/0.70 and white background. Retain configured output limits and scope bounds.
- Workflow Host images inherit default call control. Optional representative-image failures skip the image, while canceled errors propagate through package helpers. The note owner stages image bytes before its existing atomic native transaction.

## Risks / Trade-offs

- Per-image worker startup has a small cost, but permits isolated cancellation and avoids scheduler state.
- Firefox 115 source exposes both APIs to Worker with OffscreenCanvas enabled by default; real Zotero 7/9/10 tests must verify the packaged worker and output MIME. No UI fallback is installed.
- Build prerequisites must have fresh evidence before plugin build. Missing external artifacts are reported without fabricating freshness or dispatching unauthorized builds.

## Migration Plan

No data migration or public version change. Ship the worker with the plugin and update the built-in workflow helper in the same change. Preserve the currently hung user task for separate recovery.
