## Context

Short notifications serve two consumers: Zotero UI toasts and Host Bridge clients. The UI path needs immediate delivery, while Host Bridge needs a bounded read model that is cheap and safe to call repeatedly. Keeping Host Bridge reads tied to workflow/task/history projection makes an inbox call unexpectedly expensive and couples notification behavior to unrelated runtime stores.

## Goals / Non-Goals

**Goals:**

- Keep short notification events in a bounded FIFO memory queue.
- Deliver visible short toasts synchronously when the Hub accepts a displayable event.
- Let multiple Host Bridge clients consume the same queue independently with best-effort cursors.
- Suppress duplicate visible toasts by semantic display group across owners.
- Preserve lifecycle observability when user preferences suppress visible workflow toasts.

**Non-Goals:**

- Persist notifications across Zotero restarts.
- Add TTL cleanup, polling timers, or background projection tasks.
- Move progress toasts into the Hub.
- Require Host Bridge clients to register before reading notifications.

## Decisions

- Use FIFO-only retention with `maxEvents`. This keeps the Hub deterministic and avoids timer ownership in the Zotero host.
- Store suppressed duplicate events with `suppressed: true`. This keeps diagnostic evidence while default Host Bridge results remain user-facing.
- Use `displayGroupKey` for cross-owner UI suppression and keep `dedupKey` for same-source idempotence. `displayGroupKey` is the governance contract; `dedupKey` remains an event-level duplicate key.
- Advance a `clientId` cursor when `list` returns events. Ack stays independent because clients often want at-most-once delivery without a second round trip.
- Treat missing cursor markers as FIFO truncation and return `truncated: true`. The Hub cannot distinguish an unknown marker from one already pruned, so the response is conservative.
- Keep the Host Bridge notification inbox adapter in place. Existing notification event DTOs remain stable while storage and read behavior move to the Hub.

## Risks / Trade-offs

- Cursor state is memory-only, so client cursors reset when Zotero restarts. This matches the Hub retention model and is exposed as best-effort behavior.
- Display-group suppression depends on call sites assigning meaningful keys. The Hub enforces the rule when keys are present; ownership cleanup remains incremental for older call sites.
- Suppressed events increase queue churn. FIFO cap bounds memory and preserves the most recent diagnostic data.

## Migration Plan

- Add the Hub and route Host Bridge notification reads to it.
- Route short toast seam calls through the Hub.
- Assign explicit owners and display groups to high-risk toast sites.
- Update CLI and tests.
- Keep legacy projection helpers callable for write/update paths and tests, but remove projection from Host Bridge list/wait reads.

## Open Questions

- None for this change.
