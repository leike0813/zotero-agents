# persist-workbench-note-payloads-as-embedded-attachments

## Why

Zotero's note editor normalizes note HTML when a note is opened or previewed. That normalization strips the literature workbench's custom hidden payload blocks and representative-image wrapper blocks, so generated digest notes with embedded images can become non-exportable after normal user interaction.

## What Changes

- Store `digest-markdown`, `references-json`, and `citation-analysis-json` payloads as note-child embedded-image attachments with a stable payload marker and envelope.
- Stop writing new literature workbench generated notes with `data-zs-payload`, `data-zs-note-kind`, hidden metadata blocks, or custom representative-image wrappers.
- Render representative images using Zotero's legal `<img data-attachment-key="...">` note format only.
- Keep legacy HTML payload blocks readable for existing notes.
- Update export, Host Bridge note payload APIs, MCP-backed reads, synthesis paper artifact reads, topic digest image rendering, and Obsidian templates to consume the unified payload resolver.

## Impact

- Affected specs: `literature-workbench-package`, `zotero-host-broker-capability-api`, `synthesis-paper-registry`, `topic-synthesis-detail-ui`.
- Affected code: literature workbench note codecs/apply/export/import helpers, Host Bridge note payload serialization, synthesis library/registry artifact scanning, representative image descriptor parsing, and targeted tests.
