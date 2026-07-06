## Context

The Artifacts column is synchronous from Zotero's item tree perspective, backed by cached asynchronous scans. Host Bridge `library.readiness_audit` reuses the same classifier, so classifier behavior is the single source of truth for UI and CLI readiness.

Recent workflow-generated notes store machine payloads in note-child embedded image attachments and add a small `data-zs-payload-anchor` image in the visible note HTML. Real library samples show that the embedded payload can exist while the visible anchor is missing for long or normalized notes.

## Goals / Non-Goals

**Goals:**

- Keep the common case cheap by preserving HTML marker detection.
- Recover generated artifact readiness when the marker is missing but the embedded payload is readable.
- Refresh cached row state after Zotero item, note, or attachment changes.

**Non-Goals:**

- Do not treat heading text alone as artifact proof.
- Do not read embedded payloads for every note or every row render.
- Do not change Host Bridge response schema or CLI command syntax.

## Decisions

1. Use embedded payload as a narrow fallback.
   - The classifier first checks existing markers: `data-zs-payload`, `data-zs-note-kind`, and `data-zs-payload-anchor`.
   - It only calls the existing note payload resolver when the note has `data-schema-version`, a generated-artifact `<h1>`, and no marker-derived kind.
   - Alternative considered: heading-only fallback. Rejected because Host Bridge readiness would report artifacts even when machine-readable payloads are missing.

2. Reuse the existing payload resolver.
   - The implementation uses `listNotePayloadBlocksForItem()` and `selectPreferredNotePayloadBlock()` so embedded-image payload parsing, storage-version preference, and `anchorStatus` behavior stay in one place.
   - No new PNG or payload parsing logic is added to the readiness module.

3. Register a direct Zotero item observer.
   - Startup registers an item observer that forwards events into the existing `onNotify()` dispatcher.
   - Shutdown unregisters it before column teardown.
   - Row updates continue to use debounced `refresh/item`, not column refresh, to avoid scrolling back to the selected row.

## Risks / Trade-offs

- [Risk] Embedded payload fallback can do file I/O. -> Mitigation: run it only after marker failure and schema/heading gating, and retain the existing per-item cache.
- [Risk] Delete notifications may not resolve item objects. -> Mitigation: keep the existing conservative full-cache invalidation path when notified ids cannot be resolved.
- [Risk] Observer registration can vary by Zotero runtime. -> Mitigation: guard registration/unregistration behind runtime API checks and log failures without breaking startup.
