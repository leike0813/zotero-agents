# Library Maintenance

Use the resident local index as the first pass for repeated library inspection. Confirm current facts through Host Bridge before reporting or acting on them.

## Index

- `refresh` pages through `zotero-bridge library snapshot` and updates SQLite atomically.
- `search` searches title, creator, identifiers, tags, collections, and publication fields.
- `item` returns one indexed record by key or numeric id.
- `stats` reports live, deleted, tag, collection, and workflow catalog counts.

## Triage

Daily inbox triage reports items with `status:0-inbox`, missing tags, missing collections, missing DOI or URL, missing attachments, or missing summary artifacts. It suggests workflows and does not write to Zotero.

## Hygiene

Weekly hygiene reports duplicate DOI/title candidates, suspicious mojibake titles, excessive tag counts, orphaned items, empty collections, and unusual item types. It proposes actions and keeps mutation behind user approval.

## Attention Queue

The attention queue combines `zotero-bridge synthesis insight attention-queue` with local index metadata to rank high-priority reading, metadata completion, and analysis tasks.

Scheduled jobs are read-only unless their reviewed job contract explicitly requires an approval-gated maintenance action.
