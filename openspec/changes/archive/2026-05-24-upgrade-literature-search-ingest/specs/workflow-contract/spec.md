## ADDED Requirements

### Requirement: Workflows may opt into write approval bypass UI

Workflow manifests SHALL support
`execution.zoteroHostAccess.allowWriteApprovalBypass: true` as an optional
declaration. Missing or false values SHALL disable the bypass option.

#### Scenario: Workflow opts in

- **WHEN** a workflow declares write approval bypass support
- **THEN** the settings UI SHALL expose a default-off run-level "auto approve
  Zotero writes" option for that workflow run.
- **AND** the option SHALL NOT be persisted as a workflow parameter.

#### Scenario: Workflow does not opt in

- **WHEN** a workflow omits the declaration
- **THEN** the settings UI SHALL NOT expose write auto-approval.

## ADDED Requirements

### Requirement: ZoteroHostAccess runtime options are ACP-only until SkillRunner supports them

Workflow request preparation SHALL convert the run-level write auto-approval
option into `runtime_options.zotero_host_access.auto_approve_writes` for ACP
skill run requests and SHALL NOT pass the option as a skill parameter.

While `SKILLRUNNER_SUPPORTS_ZOTERO_HOST_ACCESS_RUNTIME_OPTIONS` is false,
SkillRunner-bound requests SHALL NOT include
`runtime_options.zotero_host_access`.

#### Scenario: User enables write auto-approval

- **WHEN** the workflow declares bypass support and the user enables the setting
- **THEN** the ACP skill run request SHALL include
  `zotero_host_access.auto_approve_writes: true`.

#### Scenario: SkillRunner backend is selected while ZoteroHostAccess is required

- **WHEN** the final backend is SkillRunner and the workflow explicitly declares
  `execution.zoteroHostAccess.required: true`
- **THEN** the SkillRunner request SHALL omit `zotero_host_access`.
- **AND** the runtime log SHALL include
  `skillrunner_zotero_host_access_runtime_option_stripped`.
- **AND** backend/provider compatibility SHALL otherwise remain unchanged.
