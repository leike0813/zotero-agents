## Context

ACP Chat has already moved canonical transcript content to the file-backed
transcript store. The current UI-visible snapshot path still has two roles:
existing ACP Chat child UI consumes full `items`, while future paginated UI
needs the host to publish only structural panel data plus explicit pages.

The repository already has a `publishMode: "structural"` concept and a
`mergeStructuralConversationItems()` placeholder. This change completes that
small seam instead of introducing new subscription or read-model machinery.

## Goals / Non-Goals

**Goals:**

- Add an explicit read option for full versus structural ACP Chat UI snapshots.
- Keep all existing default call sites full until the child/page work is ready.
- Make structural snapshots contain only plan items and transcript metadata.
- Prevent structural publish mode from retaining full transcript item arrays.

**Non-Goals:**

- No ACP Chat child rendering changes.
- No page request routing or selected page delivery.
- No subscription API changes.
- No session index cache or global read-model rewrite.

## Decisions

### Add read options at the session manager boundary

`getAcpConversationUiSnapshot()` and `getAcpFrontendSnapshot()` will accept an
optional `{ itemMode?: "full" | "structural" }` argument. The default remains
`"full"` so current ACP Chat UI behavior does not change.

Alternative considered: add `itemMode` to listener subscription options. That
would reproduce the failed backup branch's broad listener change and risks
breaking ACP Chat, ACP Skills, and SkillRunner refresh paths.

### Structural items are plan-only

For this change, structural items are `kind === "plan"` items. Message,
thought, and tool-call transcript rows are transcript content and remain outside
structural snapshots.

Alternative considered: include tool rows because they affect visible UI. That
would keep large, frequently changing transcript content in the structural path
and blur the boundary before page rendering exists.

### Structural reads should avoid full transcript hydrate/clone work

Structural reads should not schedule transcript hydrate just to build `items`.
They can derive plan items from the active in-memory mirror when available, or
from the previous published structural snapshot. Metadata such as revision,
count, preview, and transcript state still comes from the canonical snapshot.

Alternative considered: build structural items by cloning the full transcript
then filtering it. That preserves correctness but keeps the cost this change is
meant to remove.

## Risks / Trade-offs

- Structural reads only include currently known in-memory plan items. A later
  page-reader/sidebar change will deliver transcript content through explicit
  pages.
- Default ACP Chat UI still uses full snapshots until the child can render
  pages; this change is deliberately a preparatory seam.
- Plan-only structure is intentionally conservative and may need expansion if a
  future child panel requires additional non-transcript structure.

## Migration Plan

No data migration is required. The new mode is opt-in. Rollback is limited to
removing the optional read mode and restoring the existing structural stub.

## Open Questions

- None for this change. Page reader and sidebar selected-page delivery are
  deferred to the next changes.
