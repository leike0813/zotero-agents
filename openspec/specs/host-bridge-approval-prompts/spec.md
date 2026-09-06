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

Capability approvals SHALL describe the canonical prepared action using a short target and effect summary. The approval SHALL omit raw JSON, prepared-plan tokens, file leases, caller revisions, local paths, and storage details. mutation.preview and mutation.get_operation SHALL not create approval requests.

#### Scenario: Mutation execute requires approval
- **WHEN** a Host Bridge mutation.execute request requires Zotero approval
- **THEN** the approval request SHALL describe the canonical mutation action and a short prepared target summary
- **AND** it SHALL not include raw JSON request dumps or private prepared evidence.

#### Scenario: Unknown approved capability requires approval
- **WHEN** a future or generic Host Bridge capability requires Zotero approval
- **THEN** the approval request SHALL use a human-readable Host Bridge action summary
- **AND** it SHALL not include raw JSON request dumps by default.

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

### Requirement: Scoped Host Bridge approval SHALL remain attached to its invoking ACP owner

Host Bridge SHALL route a scoped write approval using the immutable scope of the invoking ACP adapter or run and SHALL NOT use owner identity later written by another owner.

#### Scenario: ACP Chat conversations share one profile

- **GIVEN** two ACP Chat conversations share stable Host Bridge profile configuration
- **WHEN** either conversation invokes a write after both adapters are connected
- **THEN** Host Bridge SHALL route the approval to the invoking conversation
- **AND** SHALL NOT fall back to another conversation or the global approval UI.

### Requirement: Host Bridge writes SHALL be presented as Zotero write approvals

Scoped Host Bridge write requests delivered to ACP Chat or ACP Skills SHALL carry the Zotero write approval kind.

#### Scenario: A scoped mutation requires approval

- **WHEN** a Host Bridge mutation reaches an ACP owner permission surface
- **THEN** the approval card SHALL use the Zotero write review presentation
- **AND** its original Host Bridge source identifier SHALL remain unchanged.

### Requirement: Capability approval SHALL be selected from the executable contract
Host Bridge SHALL validate capability input before selecting the capability's effect and approval policy from the canonical contract. Capability handlers, CLI metadata, and surface renderers SHALL NOT maintain independent approval classifications.

#### Scenario: Invalid write input arrives
- **WHEN** a write capability receives invalid input
- **THEN** Host Bridge SHALL reject the input before creating an approval request
- **AND** no handler or mutation path SHALL execute.

#### Scenario: Valid capability arrives
- **WHEN** a capability receives valid input
- **THEN** the dispatcher SHALL apply the effect and approval policy declared for that capability
- **AND** the handler SHALL not be able to weaken or bypass the selected policy.

### Requirement: Host Bridge SHALL reject invalid write input before approval
Host Bridge SHALL validate capability input structurally before evaluating approval policy. Invalid input SHALL produce a structured error without requesting approval, invoking handlers, or mutating state.

#### Scenario: Missing required field
- **WHEN** capability input omits a required field
- **THEN** Host Bridge SHALL return a structured invalid input error
- **AND** SHALL NOT create an approval request.

#### Scenario: Undeclared field present
- **WHEN** capability input contains a field not declared in the capability input Schema
- **THEN** Host Bridge SHALL return a structured invalid input error listing the undeclared field
- **AND** SHALL NOT invoke the handler.

### Requirement: Approved mutation plans SHALL be reevaluated before effect

After approval wait, Host Bridge SHALL request fresh private preflight before the first Host effect. It MAY retain approval only when the operation plan digest is unchanged; a changed digest SHALL result in a new user-visible approval.

#### Scenario: Prepared scope changes
- **WHEN** reevaluation yields a different domain plan digest after approval
- **THEN** the previous approval SHALL not authorize the mutation
- **AND** Host Bridge SHALL show a new approval for the changed scope.
