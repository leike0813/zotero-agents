## MODIFIED Requirements

### Requirement: Host Bridge capability approvals are human-readable

Capability approvals SHALL describe the canonical prepared action using a short target and effect summary. The approval SHALL omit raw JSON, prepared-plan tokens, file leases, caller revisions, local paths, and storage details. mutation.preview and mutation.get_operation SHALL not create approval requests.

#### Scenario: Mutation execute requires approval
- **WHEN** a Host Bridge mutation.execute request requires Zotero approval
- **THEN** the approval request SHALL describe the canonical mutation action and a short prepared target summary
- **AND** it SHALL not include raw JSON request dumps or private prepared evidence.

#### Scenario: Unknown approved capability requires approval
- **WHEN** a future or generic Host Bridge capability requires Zotero approval
- **THEN** the approval request SHALL use a human-readable Host Bridge action summary
- **AND** it SHALL not include raw JSON request dumps by default.

## ADDED Requirements

### Requirement: Approved mutation plans SHALL be reevaluated before effect

After approval wait, Host Bridge SHALL request fresh private preflight before the first Host effect. It MAY retain approval only when the operation plan digest is unchanged; a changed digest SHALL result in a new user-visible approval.

#### Scenario: Prepared scope changes
- **WHEN** reevaluation yields a different domain plan digest after approval
- **THEN** the previous approval SHALL not authorize the mutation
- **AND** Host Bridge SHALL show a new approval for the changed scope.
