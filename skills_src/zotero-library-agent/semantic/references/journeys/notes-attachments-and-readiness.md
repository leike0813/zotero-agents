# Notes, Attachments, And Readiness

Use this journey for note content, embedded workflow payloads, reader annotations, attachment access, or missing-input audits.

## Read notes correctly

- `library note get` returns one note body chunk; continue with offset/limit until the requested body is complete.
- `library note payloads` enumerates embedded payload descriptors. Select a payload id/type before `library note payload`; do not guess payload layout from note HTML.
- `library annotation list` returns structured annotation records. Use `annotation export` when a portable export format is the required evidence.

## Audit readiness

Use `readiness missing-pdf`, `missing-markdown`, or `missing-analysis` for one focused remediation list. Use `readiness audit` when the task needs multiple checks and their status together. These reads identify missing artifacts; they do not fetch, convert, analyze, or write anything.

For “selected papers missing PDFs”: read selection, normalize parent refs, constrain the readiness query to those refs when supported, and report the missing set. Stop before remediation unless the user separately authorizes the workflow or concrete write.

## Attachment access and evidence

Attachment metadata and file bytes are different evidence. If `library item attachments` returns bridge-download access, preserve its `fileId` and use `file download`. Verify checksum and byte count. If access is unavailable, report the attachment record and its error rather than reading Zotero storage directly.

## Recovery

Resume chunk/payload paging from the last accepted offset. If a registered file expires, reread the attachment record to obtain current access. Never substitute a note id, attachment id, item ref, local path, or `fileId` for another.
