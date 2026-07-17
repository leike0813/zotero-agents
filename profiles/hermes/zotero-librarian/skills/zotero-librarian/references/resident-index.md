# Resident Index

The profile-owned SQLite index accelerates repeated discovery, ranking, triage, and catalog lookup. It is a cache, not Zotero authority.

## Read policy

Use index `search`, `item`, and `stats` for repeated local discovery. Confirm current selection, item/attachment contents, workflow modes, run/permission state, Products, and every writeback fact through Host Bridge before reporting or acting.

Record the index refresh timestamp and query. If the answer depends on changes newer than that refresh, use live `library` or `context` reads immediately.

## Refresh contract

`zotero_librarian_index_service.py refresh` pages through `library snapshot` until `hasMore` is false. It builds replacement rows separately and commits the new snapshot atomically. A page, parse, or transaction failure leaves the previous usable index intact.

Do not delete or partially rewrite the old index to recover from a failed refresh. Report the failing cursor and Host Bridge error, retain old freshness metadata, and retry only after connectivity/input is corrected.

## Evidence

For index-based findings, report query, refresh time, matched item keys, and which facts were live-confirmed. Never describe a cached match as the current Zotero selection or current write state.
