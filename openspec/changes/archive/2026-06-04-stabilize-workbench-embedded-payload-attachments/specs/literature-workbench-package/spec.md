## MODIFIED Requirements

### Requirement: Literature Digest SHALL persist generated-note payloads through Zotero-safe storage
Generated digest-family notes MUST keep machine-readable payloads available after Zotero note editor normalization by using v2 anchored embedded payload storage.

#### Scenario: New generated notes use v2 anchored payloads
- **WHEN** `literature-digest` or `import-notes` writes digest, references, or citation-analysis notes
- **THEN** the visible note HTML SHALL NOT include hidden `data-zs-payload` blocks
- **AND** each generated note SHALL have a parseable v2 embedded payload attachment
- **AND** each payload attachment SHALL be referenced by a matching payload anchor in note HTML.

#### Scenario: Legacy payloads remain exportable
- **WHEN** `export-notes` reads a note with a v2 payload, v1 tail-marker payload, or hidden HTML payload
- **THEN** it SHALL export the same canonical artifact content.

### Requirement: literature-workbench-package SHALL provide a unified note and artifact codec
The package MUST use the shared v2 payload storage codec for digest-family notes, custom markdown notes, and conversation notes.

#### Scenario: conversation note round-trip is supported
- **WHEN** a conversation note created from `literature-explainer` is exported through `export-notes`
- **THEN** it SHALL export the original conversation markdown from the v2 payload attachment
- **AND** legacy hidden conversation-note payloads SHALL remain readable until migrated.
