## Context

ACP Chat's transcript migration is intentionally staged. Structural snapshots
now avoid full transcript item reads when requested, but ACP Chat still needs a
page reader that can be safely consumed by later sidebar and child-rendering
changes.

The backup migration failed when page reads were coupled to snapshot refresh,
extra subscriptions, and broad notification changes. This change keeps the
reader as a narrow read API and does not introduce a new delivery path.

## Goals / Non-Goals

**Goals:**

- Return a stable UI page DTO from `readAcpConversationTranscriptPage()`.
- Preserve current callers that only consume `.items`.
- Make the reader scope-aware by returning `backendId`, `conversationId`, and a
  stable `requestId`.
- Flush only pending writes for the requested conversation before reading.

**Non-Goals:**

- No ACP Chat child rendering changes.
- No sidebar page orchestration or selected page snapshot changes.
- No subscription API changes.
- No mirror-only page source or session index cache.

## Decisions

### Enrich the existing reader instead of adding a parallel API

`readAcpConversationTranscriptPage()` will keep its current arguments and
return `.items` plus additional metadata. This keeps existing tests and helpers
compatible while giving future page orchestration a stable DTO.

Alternative considered: add a second `readAcpConversationTranscriptPageForUi()`
API. That would create two public page readers before the UI has switched to
page rendering and make the next change choose between them.

### Durable store is authoritative

The reader will await target-session transcript writes and then read the page
from the durable transcript store. The in-memory mirror remains useful for live
snapshot publication, but it is not the page source in this change.

Alternative considered: read from the mirror when it is loaded. That would
reintroduce a second read model before page orchestration exists and make cold
conversation reads depend on hydrate state.

### Scope is explicit and stable

The reader resolves `backendId` and `conversationId` before reading. The
returned `requestId` uses the same scope and is stable for the page source:
`${backendId}\n${conversationId}`.

Alternative considered: let callers infer scope from active state. That is not
safe for background conversation page reads and would make future child guards
less reliable.

## Risks / Trade-offs

- `limit` mirrors the store's current page-limit normalization so the UI can
  reason about page boundaries without changing the lower-level store contract.
- Reads for nonexistent or empty conversations return the durable store's empty
  page shape with explicit scope metadata.
- This change does not improve publication frequency by itself; refresh
  filtering remains a later change.

## Migration Plan

No data migration is required. The reader return value is backward-compatible
for current `.items` consumers.

## Open Questions

- None for this change. Sidebar selected-page delivery and ACP Chat child page
  rendering are deferred to follow-up changes.
