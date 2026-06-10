## ADDED Requirements

### Requirement: Host Bridge wrapper skill carries generated references

ACP SkillRunner-compatible runs SHALL expose Host Bridge guidance through the
shared skill catalog and run-local skill roots.

#### Scenario: Wrapper reference is available to agents

- **GIVEN** the effective plugin skill registry contains `zotero-bridge-cli`
- **WHEN** an ACP Skills run materializes the shared catalog and proxy skills
- **THEN** the shared catalog resource manifest for `zotero-bridge-cli` SHALL
  include `references/host-bridge-cli.md`
- **AND** the run prompt SHALL NOT append a separate Host Bridge CLI prompt
  snippet.
