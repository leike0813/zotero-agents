# Design

`AssistantTranscriptRenderer.renderAssistantTranscript()` gains an optional
virtualized mode. When `virtualized: true`, the renderer accepts the current
transcript page plus a `pageKey` scope and keeps per-container state in a
`WeakMap`. That state stores cached pages, loading cursors, the current virtual
window, and the last render options needed for rAF scroll updates.

The shared renderer continues to render the same normalized transcript rows.
Virtualization only changes which raw items are sent through the existing row
projection/render path and where spacer nodes are inserted.

ACP Skills becomes a thin adapter:

- It passes `selectedTranscriptPage` as `page`.
- It passes the selected run request id as `pageKey`.
- It provides `onRequestPage` that emits `load-transcript-page`.
- It keeps only transcript revision/request guards.

The host rejects late `load-transcript-page` actions whose request id no longer
matches the selected ACP Skills run. This keeps stale scroll activity from an
old run from forcing a snapshot over a newer selection.
