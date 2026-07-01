## 1. Host Ingest API

- [x] 1.1 Add `attachLandingUrlOnMissingPdf` to literature ingest input normalization and DTO types.
- [x] 1.2 Add an internal URL attachment helper that creates or reuses one linked URL attachment per parent item and URL.
- [x] 1.3 Extend `literature.ingest` execution to attach `landingUrl` when requested and no PDF attachment exists.
- [x] 1.4 Update Host Bridge approval/preview summaries and generated docs for the new option.

## 2. Skill Output Contract

- [x] 2.1 Simplify the `literature-search-ingest` output schema to `ingested_references`, `missing_pdf_references`, and optional `ingest_failures`.
- [x] 2.2 Update `SKILL.md` and `runner.json` so per-paper ingest payloads set `paper.attachLandingUrlOnMissingPdf: true`.
- [x] 2.3 Update workflow documentation while keeping `applyResult` no-op semantics accurate.

## 3. Tests and Validation

- [x] 3.1 Extend Zotero mock support for linked URL attachments.
- [x] 3.2 Extend MCP and Host Bridge tests for missing-PDF landing URL attachment behavior and approval text.
- [x] 3.3 Extend literature-search-ingest workflow contract tests for the concise output.
- [x] 3.4 Run focused tests, TypeScript check, built-in workflow manifest check, and Host Bridge doc sync check.
