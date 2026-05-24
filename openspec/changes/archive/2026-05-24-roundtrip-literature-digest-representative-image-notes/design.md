# Design

## Overview

The round-trip format keeps `digest.md` as the primary artifact. When a digest
note contains a representative image embedded through Zotero's
`data-attachment-key` mechanism, `export-notes` writes a sidecar
`representative_image.jpg` and inserts a small `zs:representative-image:v1`
Markdown marker block after the first Markdown H1.

`import-notes` parses only this explicit marker. It does not infer
representative images from ordinary Markdown image references. The parsed marker
is removed from the digest payload before note creation so the internal Zotero
note payload remains clean.

## Failure Policy

Representative image export/import is best-effort. Missing attachment keys,
unreadable files, unsafe relative paths, missing sidecar files, and image
preparation failures skip the image while preserving the digest/references/
citation note operation.

## Digest Note Writing

The representative image helper resolves locators, prepares compressed JPEG
data, imports the Zotero embedded-image attachment, and returns a structured
render result. It MUST NOT patch digest note HTML by reading `note.getNote()`
and appending/replacing blocks after the main digest writer has run.

The digest note codec is the single content builder for digest notes. When a
representative image render result is available, the codec inserts the image or
diagnostic block after the digest H1 and still emits the canonical
`digest-markdown` payload block in the same final HTML string. New digest notes
may require a placeholder note item before importing the embedded image, but
the final note content MUST be written from the unified builder rather than from
a stale note snapshot.

## Host API

Workflow Host API v5 adds `file.readBytes`, `file.writeBytes`, and `file.copy`.
Workflow packages use these for sidecar artifacts while keeping MCP attachment
responses JSON-manifest based rather than byte-embedding based.
