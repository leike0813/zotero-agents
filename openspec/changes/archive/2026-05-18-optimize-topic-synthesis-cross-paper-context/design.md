# Design

## Context Shape

`export_cross_paper_context` now materializes three views:

- `runtime/views/cross-paper-context.md` for primary topic synthesis.
- `runtime/views/external-literature-context.md` for external literature
  analysis.
- `runtime/views/cross-paper-context.manifest.json` for machine provenance and
  diagnostics.

The existing `runtime/views/cross-paper-context.json` path may remain as a
compatibility/debug alias for the manifest, but it must not include full
artifact payloads, decoded note text, HTML, raw reference strings, or
hash-bearing artifact fields.

## Filtering Rules

The main context groups data by paper and includes paper metadata, the
per-paper analysis row, and filtered digest Markdown. Digest filtering is
language-agnostic: it counts top-level `##` headings and keeps only the first
four heading sections, preserving all content under those sections without
character truncation.

The external context also groups data by paper. Each paper section contains a
compact references block followed immediately by that paper's citation analysis
report. References keep only `id`, `year`, compact authors, and `title`.
Citation analysis keeps only the full `citation_analysis.report_md` value.

## Provenance

The manifest records paths, hashes, byte sizes, paper count, artifact status
counts, and filtering diagnostics. Runtime stores the main context path/hash in
`source_context_path` and `source_context_hash`, and the external context
path/hash in `external_context_path` and `external_context_hash`.

`persist_cross_paper_synthesis` no longer requires the agent to copy
`source_context_hash`. If the payload supplies context path/hash values, runtime
validates them against registered metadata; otherwise runtime binds provenance
from the latest exported context.
