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

### Requirement: Product-record removal approval is human-readable
The Host Bridge SHALL describe `workflow_products.remove` approval requests as
Dashboard Product record removal without exposing raw request JSON or managed
asset paths.

#### Scenario: Product removal requests approval
- **WHEN** a `workflow_products.remove` call requires Zotero approval
- **THEN** the approval title and summary SHALL identify the removal of a
  Dashboard Product record and its product id or safe display label
- **AND** the detail SHALL explain that managed asset files are retained for
  persistence cleanup.

### Requirement: Sidecar and graph maintenance approvals SHALL be independent
Reference-sidecar refresh and citation-graph update SHALL each require a separate human-readable approval describing the requested paper or library scope.

#### Scenario: Sidecar approval is granted
- **WHEN** sidecar refresh completes after approval
- **THEN** a later graph update still requires its own approval
- **AND** the earlier approval is not reused for graph mutation.

### Requirement: ACP write auto-approval SHALL require a Host-issued runtime grant
Host Bridge SHALL authorize `autoApproveWrites` only when a random unexpired grant matches an active run, runtime credential, trusted locality, request identity, and current run policy.

#### Scenario: Caller replays a previous scope
- **WHEN** a caller supplies a known request id and `autoApproveWrites` without a valid current grant
- **THEN** Host Bridge SHALL follow the normal approval path.

#### Scenario: Run reaches terminal state
- **WHEN** the owning run terminates, is rematerialized, fails injection, or the plugin restarts
- **THEN** the previous grant SHALL no longer authorize writes.

#### Scenario: Grant metadata is reported
- **WHEN** diagnostics, summaries, receipts, or run metadata are emitted
- **THEN** they SHALL NOT expose the grant id.

### Requirement: Queue registration and pending cancellation SHALL have distinct authority
Host Bridge SHALL obtain workflow submit approval before registering queue-managed prepared units, while a direct interactive cancellation of a pending Host unit SHALL not require Zotero write approval.

#### Scenario: Workflow submit is denied
- **WHEN** the submit approval is denied
- **THEN** no Host submission or queue entry SHALL be created

#### Scenario: Interactive agent cancels pending unit
- **WHEN** an authenticated interactive agent cancels a pending queue unit
- **THEN** Host Bridge SHALL execute the pending-only transition without opening a Zotero approval prompt
- **AND** resident cron policy SHALL still prohibit cancel requests
