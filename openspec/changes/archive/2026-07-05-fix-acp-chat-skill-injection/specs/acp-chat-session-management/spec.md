## MODIFIED Requirements

### Requirement: ACP Chat exposes registry-backed helper skills in all known project skill roots

ACP Chat SHALL materialize its injected skill whitelist into every known project skill root for the shared chat workspace. The injected skill source SHALL be the plugin skill registry effective entry for each skill id, preserving official, dev-local, and user source priority.

#### Scenario: Chat materializes whitelisted skills into all known roots

- **GIVEN** an ACP Chat session is preparing an adapter
- **WHEN** the plugin skill registry contains `zotero-bridge-cli` and `literature-search-ingest`
- **THEN** the chat workspace SHALL receive both skills under `.agents/skills`, `.codex/skills`, `.claude/skills`, `.gemini/skills`, `.qwen/skills`, and `.kilo/skills`
- **AND** each copied skill SHALL come from the registry effective entry for that skill id.

#### Scenario: Chat appends configured skill roots

- **GIVEN** an ACP Chat backend profile declares `acp.skillRoots`
- **WHEN** the chat injected skill target roots are resolved
- **THEN** the configured roots SHALL be added to the known project skill roots
- **AND** duplicate roots SHALL be materialized only once.

#### Scenario: Missing injected skill records a warning

- **GIVEN** an ACP Chat injected skill id is not present in the plugin skill registry
- **WHEN** ACP Chat prepares injected skills
- **THEN** ACP Chat SHALL record a warning diagnostic for that missing skill
- **AND** it SHALL continue preparing the chat adapter.

#### Scenario: Stale family root is replaced

- **GIVEN** a shared ACP Chat workspace already contains an older injected skill copy under any known project skill root
- **WHEN** ACP Chat prepares injected skills
- **THEN** the old skill copy SHALL be replaced by the current registry effective entry.
