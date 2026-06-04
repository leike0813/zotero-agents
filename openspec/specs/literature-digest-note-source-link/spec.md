# literature-digest-note-source-link Specification

## Purpose
TBD - created by archiving change enhance-literature-digest-note-source-link. Update Purpose after archive.
## Requirements
### Requirement: Literature Digest SHALL Persist Source Markdown ItemKey In Digest Note Metadata
The workflow SHALL write the input markdown attachment `itemKey` into a hidden metadata block at the top of the digest note.

#### Scenario: Digest note includes source markdown itemKey
- **WHEN** `literature-digest` workflow finishes a valid markdown attachment job
- **THEN** the written digest note SHALL contain a hidden metadata block
- **AND** the metadata SHALL include `source_markdown_item_key`
- **AND** `source_markdown_item_key` value SHALL equal the processed markdown attachment `itemKey`

### Requirement: Source Metadata SHALL Be Hidden In Zotero Note Rendering
The source metadata block SHALL be machine-readable but not user-visible in Zotero note content.

#### Scenario: Hidden metadata is not shown as visible prose
- **WHEN** user opens the digest note in Zotero
- **THEN** the source metadata block SHALL not add visible textual content in the main rendered body
- **AND** external systems can still read the `data-zs-*` metadata attributes

### Requirement: Workflow SHALL Keep Existing Digest/References Output Contracts
Adding source metadata SHALL NOT break existing digest markdown payload and references note output behavior.

#### Scenario: Digest payload remains compatible
- **WHEN** digest note is written with source metadata
- **THEN** existing `digest-markdown` payload block SHALL still be present and valid

#### Scenario: References note remains unchanged
- **WHEN** workflow writes references note in the same run
- **THEN** references note structure and payload SHALL remain compatible with existing readers

### Requirement: Workflow SHALL Degrade Gracefully If Source ItemKey Is Unavailable
If the workflow cannot resolve a valid markdown source `itemKey`, it SHALL continue digest/references write flow without failing the whole job.

#### Scenario: Missing itemKey fallback
- **WHEN** runtime cannot resolve source markdown attachment `itemKey`
- **THEN** workflow SHALL still write digest and references notes
- **AND** source metadata field MAY be omitted for that run

### Requirement: Obsidian Template Projection SHALL Include Source And Locator

Literature Digest Obsidian templates SHALL project references metadata including `Source` and `Locator`, aligned with canonical reference-note ordering, and SHALL NOT render a per-reference Citekey column.

#### Scenario: Render references in zt-note template

- **WHEN** `references-json` payload includes optional source/locator fields
- **THEN** `zt-note.eta` SHALL render references table columns in order:
  `#`, `Year`, `Title`, `Authors`, `Source`, `Locator`
- **AND** `Source` and `Locator` values SHALL follow canonical mapping rules.

#### Scenario: Render references in zt-field template

- **WHEN** `references-json` payload includes optional source/locator fields
- **THEN** `zt-field.eta` SHALL include `Source` and `Locator` in each rendered references row
- **AND** per-row segment order SHALL follow:
  `Year | Title | Authors | Source | Locator`.

### Requirement: Literature Digest language parameter declaration SHALL align with tag-regulator note language
`literature-digest` workflow language parameter declaration MUST stay aligned with `tag-regulator.tag_note_language` to keep language configuration semantics consistent across workflows.

#### Scenario: Literature digest language options match tag-regulator options
- **WHEN** workflow manifests are inspected
- **THEN** `literature-digest.parameters.language.enum` SHALL match `tag-regulator.parameters.tag_note_language.enum`
- **AND** both defaults SHALL be `zh-CN`

### Requirement: Digest workflow 必须稳定回写 source 附件元数据
系统 MUST 在 digest note 中写入源附件元数据，并保证 result artifact 消费路径与后端协议一致。

#### Scenario: applyResult resolves artifact entries from output paths without hardcoded artifacts prefix
- **WHEN** bundle result returns artifact paths in `result.data.digest_path/references_path/citation_analysis_path`
- **THEN** workflow SHALL parse these paths into bundle-readable relative entries
- **AND** workflow SHALL NOT hardcode `artifacts/<basename>` as the only lookup strategy
- **AND** digest/references/citation-analysis notes SHALL continue to upsert idempotently

