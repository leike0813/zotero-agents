## ADDED Requirements

### Requirement: Zotero Librarian profile SHALL expose shared terminology guidance

The Zotero Librarian profile SHALL include the shared Host Bridge terminology
reference so agents can interpret user-facing Zotero, Synthesis, workflow,
artifact, handle, and writeback terms consistently.

#### Scenario: Profile routes ambiguous terms to terminology

- **WHEN** a Zotero Librarian task uses shorthand or ambiguous Host Bridge terms
- **THEN** the profile skill SHALL direct the agent to
  `references/terminology.md`
- **AND** the terminology reference SHALL preserve the same canonical meanings
  as the wrapper skill.

#### Scenario: Profile terminology is generated from the shared source

- **WHEN** the Zotero Librarian profile is rendered
- **THEN** `profiles/hermes/zotero-librarian/skills/zotero-librarian/references/terminology.md`
  SHALL be copied from the shared terminology source
- **AND** the profile manifest source checksum SHALL include that shared
  terminology content.
