## Overview

The representative image feature is an optional enhancement layered onto the existing `literature-digest` apply path. The skill/agent returns only textual metadata for the selected image; the Host resolves local files, prepares a compressed JPEG, imports it as a Zotero embedded-image attachment, and injects a stable representative image block into the digest note.

## Decisions

- Agent output is a locator, not image content. The supported optional shape is `representative_image` with `status`, `source_kind`, `label`, `caption_quote`, `section_hint`, `page_hint`, `markdown_src_hint`, `selection_reason`, and `confidence`.
- Markdown is the v1 reliable materialization path. Host resolves local relative Markdown image refs only, preferring `markdown_src_hint` and falling back to nearby image refs around `label` / `caption_quote`.
- PDF materialization is best-effort. V1 may skip PDF image embedding if deterministic high-confidence extraction is unavailable; skip status must not fail note generation.
- All embedded images go through one Host compression policy: JPEG output, max long edge 720 px, target 180 KiB, hard cap 320 KiB, quality 0.82 down to 0.70.
- Zotero notes reference embedded images via `data-attachment-key`, never long-lived `file://`, remote URL, or `data:image` references.
- The digest note update is two-phase: write/upsert generated notes first, then best-effort import and inject the representative image block.

## Failure Handling

- Missing `representative_image`, `status: "none"`, unresolved source paths, unsupported source types, unsafe Markdown paths, PDF resolver unavailability, compression failure, and embed failure all return a structured skipped/warning result.
- Existing digest note content and generated note payloads remain valid even when image materialization fails.
- Updating an existing digest note replaces the prior representative image block and best-effort removes the old embedded image attachment when it can be resolved safely.

## Submodule Boundary

`skills_builtin/literature-digest` is treated as externally owned. This change only adds Host-side support and an upstream recommendation document describing the optional result contract expected from a future submodule update.
