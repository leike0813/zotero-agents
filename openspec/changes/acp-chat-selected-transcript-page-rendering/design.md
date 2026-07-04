## Context

ACP Skills already uses a stable pattern for long transcripts: the host delivers
only the selected page, and the child renderer owns virtual scrolling and page
requests. ACP Chat has the same durable page reader now, but still lacks the
host/child selected-page contract.

The failed backup branch coupled this work to subscription rewrites, backend
refresh changes, and global read-model isolation. This change deliberately keeps
the boundary smaller: one host delivery path and one child rendering guard.

## Goals / Non-Goals

**Goals:**

- Deliver ACP Chat structural snapshot data plus a selected transcript page when
  transcript pagination virtualization is enabled.
- Keep the existing full/eager ACP Chat render path when the preference is
  disabled.
- Ensure ACP Chat child rendering rejects stale or wrong-scope pages.
- Route page requests without refreshing backends or adding subscriptions.

**Non-Goals:**

- No publication-path live/background filtering.
- No backend refresh policy rewrite.
- No session index cache or listener option map.
- No shared renderer changes.

## Decisions

### Use the existing preference as the switch

The host will use
`isAssistantTranscriptPaginationVirtualizationEnabled()` to decide whether ACP
Chat receives a structural snapshot and selected page. When disabled, the
existing full snapshot and eager render behavior remain intact.

### Host reads the selected durable page

The assistant workspace sidebar will use `readAcpConversationTranscriptPage()`
to read the tail page for ordinary ACP Chat snapshots and a requested cursor for
`load-transcript-page`. The selected page is attached as
`selectedTranscriptPage`.

### Child guards pages by scope

The ACP Chat child will derive the page key as
`${backendId}\n${conversationId}`. A page must match that key, and any explicit
`backendId`/`conversationId` fields, before it can be rendered.

### Keep refresh topology unchanged

This change keeps the single existing frontend snapshot subscription. Page
requests force an ACP Chat snapshot post directly, but they do not call backend
refresh and do not add a conversation subscription.

## Risks / Trade-offs

- The host still receives ordinary frontend notifications for ACP Chat live
  updates. Filtering those updates is a follow-up change.
- The host reads a durable tail page on virtualized ACP Chat snapshots. This is
  bounded by page size and replaces full transcript payload delivery.
- Child smoke tests use a VM harness because the ACP Chat child is a static
  content script.

## Migration Plan

No data migration is required. The change is controlled by the existing
transcript pagination virtualization preference.

## Open Questions

- None for this change. Publication-path filtering remains the next planned
  stage.
