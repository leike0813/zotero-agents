# host-bridge-approval-prompts Specification

## Purpose
TBD - created by archiving change humanize-host-bridge-approval-prompts. Update Purpose after archive.
## Requirements
### Requirement: Host Bridge workflow approvals are human-readable
The system SHALL present workflow submission approvals using concise
user-facing text rather than raw machine payloads.

#### Scenario: Workflow submission requires approval
- **WHEN** a Host Bridge workflow submission requires Zotero approval
- **THEN** the approval request SHALL include the workflow label or id
- **AND** it SHALL summarize the explicit input in human-readable terms
- **AND** the title, summary, and detail SHALL NOT include raw JSON request
  dumps.

### Requirement: Host Bridge capability approvals are human-readable
The system SHALL present capability approvals using concise user-facing text
that describes the requested action.

#### Scenario: Mutation execute requires approval
- **WHEN** a Host Bridge `mutation.execute` request requires Zotero approval
- **THEN** the approval request SHALL describe the mutation action in
  user-facing terms such as adding tags, removing tags, or updating fields
- **AND** it SHALL include a short target summary
- **AND** it SHALL NOT include raw JSON request dumps.

#### Scenario: Unknown approved capability requires approval
- **WHEN** a future or generic Host Bridge capability requires Zotero approval
- **THEN** the approval request SHALL still use a generic human-readable Host
  Bridge action summary
- **AND** it SHALL NOT include raw JSON request dumps by default.

### Requirement: Permission details affordance is user-facing
The dashboard permission UI SHALL label the expandable approval detail area as
details rather than a full request dump.

#### Scenario: Permission detail button is rendered
- **WHEN** a pending approval request has additional detail text
- **THEN** the dashboard SHALL label the expansion action as viewing details.

