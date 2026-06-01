## Context

`paper_ref` is a public Zotero-bound locator. It is useful for Host Bridge
lookup, UI/debug display, and binding fallback, but it is not a durable work
identity. The Registry needs an identity resolver that can converge the same
work across Zotero-bound and external records.

## Goals / Non-Goals

**Goals:**

- Derive `literature_item_id` from the selected identity anchor.
- Keep fallback IDs stable when no stronger anchor exists.
- Retarget fallback IDs to strong work IDs through redirects when strong
  evidence appears.
- Keep `citeKey` as a matching signal, not a canonical work anchor.

**Non-Goals:**

- No fuzzy merge.
- No cross-library automatic merge without strong non-conflicting identity.
- No user-visible ID format change beyond deterministic `lit:<24 hex>`.

## Decisions

- Anchor priority is accepted redirect/tombstone, unique DOI/arXiv/ISBN/stable
  URL, active Zotero binding fallback, compatible provisional/fallback identity,
  then allocation.
- Strong anchors derive IDs from canonical `{ kind, value }` identity refs.
- Binding fallback derives from canonical `paper_ref` only when no stronger
  anchor exists.
- Existing binding fallback IDs that acquire a strong identity are preserved as
  redirect sources; dependent rows are retargeted through repository operations.

## Risks / Trade-offs

- Identity changes can affect many downstream rows. Tests must verify graph,
  metadata cache, artifact state, and redirects remain coherent.
