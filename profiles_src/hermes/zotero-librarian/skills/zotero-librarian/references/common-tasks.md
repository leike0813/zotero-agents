# Common Task Playbook

Use this reference to map common Zotero librarian requests to command paths.

## Missing Inputs And Artifacts

- Missing PDF: `zotero-bridge library readiness missing-pdf --query <JSON_OR_FILE>`.
- Missing source Markdown: `zotero-bridge library readiness missing-markdown --query <JSON_OR_FILE>`.
- Missing literature-analysis 三件套: `zotero-bridge library readiness missing-analysis --query <JSON_OR_FILE>`.

Use readiness results for planning. They do not fetch PDFs, convert Markdown, or run analysis.

## Literature Search And Ingest

For search or ingest requests that are mostly query-driven and weakly dependent on current Zotero selection, prefer `$zotero-workflow-agent-runner` with `literature-search-ingest` when the handoff contract is clear. If the user wants Host Bridge/backend execution and run monitoring, use Host-owned `workflow submit`.

## Literature Analysis

For selected papers or a readiness remediation list, normalize to parent item refs first. Use `literature-analysis` for missing digest, references, and citation-analysis artifacts. Launch one backend submission by default unless the user confirms concurrency.

## Tags And Metadata

Use `tag-regulator` when the requested behavior is a workflow-level tag normalization task. Use `mutation tag ...` only when the requested tag operation is already concrete and does not require semantic inference.

## Annotation And Evidence

Use `library annotation list` or `library annotation export` for PDF highlights and reader annotations. Annotation commands are read-only.

## Synthesis Graph And Topics

Use `synthesis graph ...` for citation graph requests and `synthesis topic ...` for topic synthesis requests. Use workflow commands only when the task asks to create or update a synthesis artifact.

## Writeback

Use mutation preview/apply or mutation-backed semantic commands for Zotero writes. Use workflow apply-back only when a workflow handoff or result contract requires it.
