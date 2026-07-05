# Design

## Context and Selection

`GET /bridge/v1/context/current` reuses the existing
`context.get_current_view` host capability implementation. It returns the
active Zotero target, library id, selection state, current item summary when
available, and selected item summaries.

`GET /bridge/v1/context/selection` reuses the existing
`context.get_selected_items` host capability implementation and returns a
lightweight selected item list.

## Restricted Navigation

Navigation endpoints accept only Zotero object handles. Item and note references
may be provided as a key string, `libraryId:itemKey`, or object with `key`/`id`
and optional `libraryId`. Collection navigation accepts a collection key plus
optional `libraryId`.

Navigation is not a write operation and does not require Zotero UI approval, but
it must not accept arbitrary URI, filesystem path, or JavaScript payloads.
Failures return stable error codes such as `invalid_object_ref`,
`item_not_found`, `note_not_found`, and `collection_not_found`.

## CLI Surface

The CLI adds a new canonical `context` namespace. Read commands use GET
endpoints. Open commands build explicit JSON bodies and never route through raw
`call`.

Generated wrapper/profile documentation should teach agents to read context
first, navigate only by Zotero object handle, and treat navigation as UI
positioning rather than data mutation.
