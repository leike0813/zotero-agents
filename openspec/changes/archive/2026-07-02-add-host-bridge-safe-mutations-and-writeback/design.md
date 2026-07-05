## Design

`mutation.preview` and `mutation.execute` remain the single write contract.
Semantic CLI commands build payloads for that contract; they do not bypass
approval or create parallel write endpoints.

Inbound files use a separate short-lived registry. The CLI reads one local file
and uploads bytes to Host Bridge. Host Bridge stores the bytes in a managed
runtime location, returns an opaque `fileId`, and never treats the caller's
source path as a Zotero path. `item.attachFile` consumes that handle through the
mutation path and attaches the managed file to the target Zotero item.

Annotation commands are read-only. They may project Zotero reader annotations
when available, or return an empty supported response when the runtime exposes
no reader annotation API.

## Safety

- Execute requires existing Zotero-side approval unless a valid registered ACP
  write scope enables auto-approval.
- Preview and execute responses do not expose tokens, provider payloads,
  arbitrary local private paths, or transcript content.
- Uploaded file handles are opaque, bounded, short-lived, and single-file only.
- Attach consumes only uploaded Host Bridge file handles.
