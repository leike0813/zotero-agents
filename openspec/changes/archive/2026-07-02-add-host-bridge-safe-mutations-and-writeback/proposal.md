## Why

Hermes and the Zotero Librarian profile can inspect and navigate Zotero, but
they still need a safe writeback loop for routine library maintenance and
agent-produced artifacts. Existing Host Bridge mutation preview/apply is the
right approval boundary, but several supported operations are only raw payloads
and file writeback lacks an inbound file handle.

## What Changes

- Expose canonical CLI builders for tag, collection, item update, note, and
  file-attachment mutations.
- Add `collection.create` and uploaded-file attachment mutation support to the
  existing `mutation.preview` / `mutation.execute` model.
- Add a restricted `POST /bridge/v1/files/upload` endpoint that returns
  short-lived opaque file handles.
- Add read-only annotation list/export capabilities and canonical CLI commands.
- Update Host Bridge generated surfaces and Zotero Librarian semantic guidance.

## Non-Goals

- No webhook delivery, task history, backend diagnostics, cache invalidation, or
  arbitrary Zotero eval.
- No full Markdown-to-Zotero rich text renderer.
- No directory upload, batch multipart upload, or persistent artifact store.
