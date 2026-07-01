## Context

`literature-search-ingest` is an interactive SkillRunner workflow whose actual Zotero writes happen through repeated permission-gated `literature.ingest` mutation calls. Its current final payload is machine-valid but too verbose for users because it includes confirmed candidates, counters, full per-paper results, and missing-PDF references.

`literature.ingest` already receives `landingUrl` and `pdfUrl`. It writes `landingUrl` to the bibliographic item URL field and imports `pdfUrl` as a best-effort PDF attachment, but it does not create a Zotero attachment that opens the landing page when the PDF is unavailable.

## Goals / Non-Goals

**Goals:**

- Keep `literature.ingest` single-paper and permission-gated.
- Add an explicit opt-in flag for missing-PDF landing URL attachments.
- Make landing URL attachment creation best-effort and idempotent.
- Reduce `literature-search-ingest` final output to user-facing ingest and missing-PDF lists.

**Non-Goals:**

- Do not download web page snapshots.
- Do not create attachments for every manual search link.
- Do not move ingest writes into workflow `applyResult`.
- Do not reintroduce batch literature ingest or legacy `paper.ingest` behavior.

## Decisions

- Add `paper.attachLandingUrlOnMissingPdf` instead of making `landingUrl` imply an attachment.
  Existing callers often provide `landingUrl` for item metadata only. Explicit opt-in avoids surprising new child attachments.

- Create URL attachments during `literature.ingest`, after PDF attachment evaluation.
  This keeps all Zotero item mutations in the existing permission-gated mutation boundary and leaves workflow `applyResult` as a no-op.

- Use Zotero linked URL attachments through a handler helper.
  The helper centralizes parent resolution, URL validation, title/content type patching, and duplicate detection for parent + URL.

- Report landing URL attachment status separately from PDF attachment status.
  `attachmentStatus` remains the PDF status; `landingAttachmentStatus` describes the secondary URL link behavior so existing consumers do not reinterpret PDF outcomes.

## Risks / Trade-offs

- [Risk] Some Zotero runtimes may not expose `Zotero.Attachments.linkFromURL`.  
  Mitigation: return `landingAttachmentStatus: "failed"` with a structured error and keep ingest successful.

- [Risk] Existing items can already have manually created URL attachments with inconsistent metadata.  
  Mitigation: dedupe by normalized URL under the same parent and treat a matching attachment as an attached result.

- [Risk] The concise output hides routine counters.  
  Mitigation: retain `ingest_failures` only when non-empty; success and missing-PDF lists remain enough for user follow-up.
