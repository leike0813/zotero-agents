# Design

## Scope

This change improves MCP discoverability for paper reading tasks. It aggregates existing item detail, note summary, note payload manifest, and attachment manifest data into one bounded tool result. It does not read attachment bytes or parse PDF content.

## Reading Context Tool

`prepare_paper_reading_context` accepts an explicit item ref. If no ref is supplied, it resolves the current Zotero item first, then a single selected item. Multiple selected items are rejected with candidate refs so the agent can ask or retry with a specific item.

The tool returns:

- resolved item metadata;
- bounded note summaries;
- bounded note payload manifests, with markdown payloads marked as readable;
- attachment manifests with reading metadata;
- one recommended reading attachment;
- next-call guidance and limitations.

## Attachment Reading Metadata

Attachment classification is deterministic and based only on existing manifest fields: filename/title, content type, local path, and access mode.

Priority is:

1. Markdown full text
2. TXT full text
3. PDF
4. Web/link
5. Unknown

Main-document filename signals such as `full`, `paper`, `main`, `article`, and `manuscript` increase rank. Supplementary signals such as `supplement`, `appendix`, `dataset`, `figure`, `image`, and `table` decrease rank.

## Boundaries

The result must explicitly state that attachment file content is not returned. If an agent cannot read `access.path`, it must report that limitation. Reader/annotation context, stronger item lookup, collection/tag navigation, and attachment text chunk tools are future changes.
