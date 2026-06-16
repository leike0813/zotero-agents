## MODIFIED Requirements

### Requirement: SkillRunner Host Bridge env injection

The plugin SHALL translate required Zotero Host Bridge access for SkillRunner
HTTP backend requests into generic `runtime_options.env` values without
requiring SkillRunner-specific Zotero protocol fields.

#### Scenario: Host Bridge env includes run scope

- **GIVEN** a workflow declares required Zotero Host Bridge access
- **AND** the target backend is SkillRunner
- **WHEN** the plugin prepares a `skillrunner.job.v1` request
- **THEN** the request SHALL include `runtime_options.env.ZOTERO_BRIDGE_SCOPE`
  containing JSON scope with `kind: "skillrunner-run"`
- **AND** that scope SHALL include a stable non-empty `requestId`.

#### Scenario: Scope request id is stable before submission

- **GIVEN** a SkillRunner request requiring Host Bridge access has no reusable
  workspace request id
- **WHEN** the plugin prepares the request
- **THEN** the plugin SHALL generate a stable request id for this run
- **AND** it SHALL use that id in `runtime_options.workspace.request_id`
- **AND** it SHALL use the same id in `ZOTERO_BRIDGE_SCOPE`.
