## ADDED Requirements

### Requirement: Workbench presents Git Sync config and runtime status

Workbench SHALL show Git Sync configuration status, remote, branch, queue state, last run, diagnostics, and conflict count.

#### Scenario: Git Sync is not configured

- **WHEN** Git Sync has no enabled prefs-backed adapter
- **THEN** Workbench SHALL offer `Open preferences`
- **AND** it SHALL NOT present long-term Git Sync configuration controls inline.

#### Scenario: Git Sync is configured

- **WHEN** Git Sync configuration is complete
- **THEN** Workbench SHALL offer runtime actions such as sync, pause/resume, and retry according to allowed actions.

#### Scenario: Remote branch will be initialized

- **WHEN** the latest connection test reports `remote_branch_state` as `missing_initializable`
- **THEN** Workbench SHALL present the branch state as initializable rather than failed
- **AND** it SHALL keep `Sync now` available when allowed by the service state.

### Requirement: Workbench presents semantic conflict approvals

Workbench SHALL present Git Sync conflict approvals using semantic action names.

#### Scenario: Conflict is blocked

- **WHEN** Git Sync state is `blocked_conflict`
- **THEN** Workbench SHALL show the conflict asset path, reason, and available hashes
- **AND** it SHALL offer supported conflict actions from the Git Sync state.
