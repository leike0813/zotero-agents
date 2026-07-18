# Current Context And Library Read

Use this journey when the request names “this paper”, the current selection, a collection, a bibliographic candidate, or one known Zotero item.

## Route

1. Resolve deictic language with `context current` and `context selection get`. Keep the returned ordered top-level item refs; do not reconstruct keys from titles.
2. Use `library item search` for a finite relevance-ranked candidate set. Use `library items list` for deterministic collection/tag/type inventory and page every `nextCursor`.
3. Use `library item get` only after choosing one stable item ref. Read `item notes` and `item attachments` as separate child collections.
4. Report keys, library ids, the filters used, paging completion, and the exact current-context evidence.

## Branches and near misses

- A search result is a candidate, not the authoritative complete collection. Fetch the chosen item before reporting detailed metadata.
- `library snapshot` is for building a local metadata mirror; it is not a replacement for a current item read.
- Navigation commands change the visible Zotero UI but do not mutate bibliographic data. Use them only when the user asked to open a known object.
- If a selected ref is a note or attachment, normalize to its top-level parent before workflow selection or parent-item reporting.

## Failure recovery

On an empty selection, ask for an explicit item/collection or continue only if the request is independent of UI context. On a stale ref, reread current context or search for candidates; never guess another key. On paging failure, keep accepted pages and resume from the last cursor.
