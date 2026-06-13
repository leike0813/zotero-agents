# Design: Structured Literature Deep Reading Rendering

## Structured Blocks

Bootstrap parsing treats paper Markdown as reading units. Headings and ordinary paragraphs remain textual blocks. Display math (`$$...$$`) becomes a `formula` block. Markdown and HTML images are grouped with adjacent figure-style captions into an `image` block. Markdown and HTML tables are grouped with adjacent table-style captions into a `table` block.

Structured blocks keep `source_markdown` for backward compatibility and add kind-specific fields such as `caption_markdown`, `image_refs`, and `table_markdown_or_html`. References and later blocks continue to be marked `translate: false`.

## Translation and Rendering

The Stage 30 payload remains `translations[]` with `block_id` and `translated_markdown`. Runtime validation interprets the submitted markdown by block kind. Formula blocks can be carried over. Image translations must preserve image references and translate caption text. Table translations must remain table-like and must not prepend or append explanatory prose outside the table/caption unit.

The Stage 40 renderer uses the same fragment renderer for source and translation. HTML tables submitted for table blocks are allowed through a conservative sanitizer instead of being escaped as paragraph text. Display and inline math are rendered locally before being embedded into the self-contained HTML.

## Reference Digests

Stage 10 consumes `reference-index get` rows that use Host fields including `target_paper_ref`, `target_literature_item_id`, `target_title`, `target_binding`, `binding_status`, and `confidence`. Only rows whose target binding is `library` and that have a target paper ref become library-bound references. Those rows are exported through `paper-artifacts export-filtered` for digest artifacts and exposed as digest modals in structured References.

## Summary

When the target paper digest artifact exists, Summary keeps only the first five top-level `##` sections. This mirrors the Host digest export filter and avoids language-specific title matching. Fallback summaries from the agent remain unchanged.
