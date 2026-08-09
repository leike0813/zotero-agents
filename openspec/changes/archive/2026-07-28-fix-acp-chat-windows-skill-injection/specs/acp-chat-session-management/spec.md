## MODIFIED Requirements

### Requirement: ACP Chat exposes registry-backed helper skills in configured project skill roots

ACP Chat SHALL materialize its injected skill whitelist into the stable union of
project skill roots required by every configured ACP backend, including disabled
profiles. Each backend SHALL contribute its family defaults and its additional
`acp.skillRoots`. The injected skill source SHALL be the plugin skill registry
effective entry for each skill id, preserving official, dev-local, and user
source priority. Managed target resolution SHALL preserve native local filesystem
syntax; portable path normalization SHALL be used only for validation and
comparison. The managed ownership manifest SHALL bound writes and cleanup but
SHALL NOT be treated as evidence that materialization succeeded.

#### Scenario: Windows chat workspace materializes native Skill targets

- **GIVEN** the shared ACP Chat workspace is on a Windows drive
- **WHEN** ACP Chat resolves and copies its whitelisted Skill targets
- **THEN** paths passed to native runtime and Zotero file APIs SHALL use valid
  Windows local-path syntax
- **AND** portable containment comparison SHALL NOT alter the returned target
  path.

#### Scenario: Complete materialization reports ready

- **GIVEN** every whitelisted Skill is available in the plugin Skill registry
- **AND** every planned target can be copied
- **WHEN** ACP Chat completes shared-workspace preparation
- **THEN** it SHALL report `acp_chat_injected_skills_ready`
- **AND** the diagnostic SHALL identify the complete planned and materialized
  target counts.

#### Scenario: Incomplete materialization does not report ready

- **GIVEN** a whitelisted Skill is missing or a planned target copy fails
- **WHEN** ACP Chat completes shared-workspace preparation
- **THEN** it SHALL report `acp_chat_injected_skills_unavailable`
- **AND** it SHALL NOT report `acp_chat_injected_skills_ready`
- **AND** the structured diagnostic SHALL identify missing Skill ids and failed
  targets without treating manifest ownership as success.
