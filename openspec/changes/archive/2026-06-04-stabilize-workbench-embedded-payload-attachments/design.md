# Design

## Storage Contract

New Workbench payload writes use a note-child embedded image attachment containing a valid PNG with a Workbench payload ancillary chunk before `IEND`. The note HTML also contains one legal `<img data-attachment-key>` anchor for each active payload type, marked with `data-zs-payload-anchor`.

The payload parser supports three sources in priority order:

1. v2 embedded image attachment with a valid PNG payload chunk.
2. v1 embedded image attachment with the legacy tail marker.
3. hidden HTML payload block.

Only v2 is written by new workflow code. v1 and hidden HTML are compatibility inputs for export and explicit migration.

## Anchor Retention

`attachWorkbenchPayloadToNote()` owns both attachment import and note HTML anchor update. After import it inserts or replaces a payload anchor for the same payload type and removes old payload attachments/anchors for that type. The anchor uses Zotero's normal `img[data-attachment-key]` relationship so Zotero's unused embedded-image cleanup treats the payload image as referenced.

Representative images remain separate. Representative-image cleanup must ignore anchors with `data-zs-payload-anchor`.

## Workflow Coverage

Digest-family notes and conversation notes share the same payload writer. `literature-explainer` creates visible conversation note HTML without hidden payload blocks, then stores `conversation-note-markdown` through the v2 attachment writer.

Export and payload-read paths continue to read legacy hidden blocks and v1 embedded payloads so old notes remain usable until migrated.

## Migration

`debug-migrate-note-payloads` scans selected notes and parent child notes. It migrates hidden HTML payloads and v1 tail-marker embedded payloads to v2 anchored payloads. It also repairs v2 payloads that are missing anchors. Notes with visible content but no recoverable payload are reported as skipped diagnostics and are not treated as available artifacts.

## Synthesis Boundary

Synthesis sidecar/index availability only accepts parseable embedded payload attachments. Hidden HTML payloads can be reported as legacy diagnostics, but they must not make a digest/references/citation-analysis artifact available.
