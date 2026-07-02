# Design

## Control Surface

`library.readiness_audit` is a read-only Host Bridge capability. CLI commands under `library readiness` are semantic payload builders for that capability:

- `audit` passes user input through.
- `missing-pdf` adds `checks: ["pdf"]` and `missingOnly: true`.
- `missing-markdown` adds `checks: ["markdown"]` and `missingOnly: true`.
- `missing-analysis` adds `checks: ["analysis"]` and `missingOnly: true`.

The capability reuses the existing library page selector so `libraryId`, collection, tag, item type, query, cursor, and limit behave like `library snapshot` and `library items list`.

## Readiness Rules

PDF readiness uses the same best-PDF logic as the artifact evaluator: Zotero `isPDFAttachment()`, `application/pdf`, or a `.pdf` filename.

Source Markdown and analysis readiness are derived from the shared Artifact evaluator used by the Zotero `Artifacts` column:

- Source Markdown is present only when a `.md` or `.markdown` attachment has the same filename stem as the best PDF attachment.
- Analysis is present only when `digest`, `references`, and `citation-analysis` generated note markers are all present.

The result returns compact item summaries, present/missing fields, missing checks, and redacted evidence. Evidence may include filenames and artifact state, but not local paths, transcript text, backend payloads, or decoded note payload bodies.

## Approval

The capability is read-only and requires no Zotero UI approval. It must not trigger workflow execution, mutation preview/apply, cache invalidation, or file download registration.
