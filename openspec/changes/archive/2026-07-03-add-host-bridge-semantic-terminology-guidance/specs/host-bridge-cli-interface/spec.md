## ADDED Requirements

### Requirement: Wrapper skill SHALL expose Host Bridge terminology guidance

The Host Bridge CLI wrapper skill SHALL include a terminology reference for
common Zotero, Synthesis, workflow, artifact, handle, and writeback terms.

#### Scenario: Agent resolves shorthand before choosing commands

- **WHEN** a user request uses shorthand such as `图谱`, `三件套`,
  `digest`, `references`, `citation analysis`, run handles, notifications,
  file handles, or writeback terms
- **THEN** the wrapper skill SHALL direct the agent to
  `references/terminology.md`
- **AND** the terminology reference SHALL map the term to the current canonical
  Host Bridge concept and recommended CLI entry point.

#### Scenario: Terminology is rendered from the shared source

- **WHEN** Host Bridge surface rendering runs
- **THEN** `skills_builtin/zotero-bridge-cli/references/terminology.md` SHALL be
  copied from the shared Host Bridge terminology source
- **AND** it SHALL remain current-state only.
