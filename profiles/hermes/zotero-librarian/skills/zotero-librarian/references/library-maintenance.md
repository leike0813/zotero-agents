# Library Maintenance

Use the local index as the first pass for repeated library inspection.

## Index

- `refresh` pages through `zotero-bridge library snapshot` and updates SQLite atomically.
- `search` searches title, creator, identifiers, tags, collections, and publication fields.
- `item` returns one indexed record by key or numeric id.
- `stats` reports live, deleted, tag, collection, and workflow catalog counts.

## Triage

Daily inbox triage should report items with `status:0-inbox`, missing tags, missing collections, missing DOI or URL, missing attachments, or missing summary artifacts. It should suggest workflows and not write to Zotero.

## Hygiene

Weekly hygiene should report duplicate DOI/title candidates, suspicious mojibake titles, excessive tag counts, orphaned items, empty collections, and unusual item types. It should propose actions and keep mutation behind user approval.

## Attention Queue

The attention queue combines `zotero-bridge insights attention-queue` with local index metadata to rank high priority reading, metadata completion, and analysis tasks.
