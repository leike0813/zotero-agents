## MODIFIED Requirements

### Requirement: Host Bridge service calls broker capabilities

The system SHALL route Bridge calls through JSON-safe Host Capability Broker APIs. Canonical mutation transport SHALL expose effect-free mutation.preview and mutation.execute for each of the closed 23-operation canonical mutation union, plus read-only mutation.get_operation. MCP SHALL mirror the same Bridge definition and handler. Mutation execution and observation SHALL use the Broker durable caller namespace, independent of generic HTTP request IDs, transient connections, and X-Zotero-Bridge-Scope. mutation.get_operation SHALL expose only running, settled(result), or unavailable; it SHALL not expose request payloads, timestamps, scope, or identity-binding details. No Bridge route SHALL fall back to legacy mutations, direct Zotero APIs, public prepared tokens, or generic HTTP operation history.

#### Scenario: Canonical mutation is observed
- **WHEN** an authenticated Bridge or MCP client calls mutation.get_operation
- **THEN** the Bridge SHALL invoke the Broker read-only observation
- **AND** it SHALL not execute, retry, or query generic HTTP operation history.

#### Scenario: Broker capability succeeds
- **WHEN** an authenticated client calls a known capability with valid JSON input
- **THEN** the bridge SHALL return a structured success response with the Broker result
- **AND** it SHALL not expose native Host objects, local paths, public tokens, or caller revisions.

#### Scenario: Unknown capability fails structurally
- **WHEN** an authenticated client calls an unknown capability
- **THEN** the bridge SHALL return a structured error with a stable error code
- **AND** no fallback to direct Zotero native APIs SHALL occur.

### Requirement: Host Bridge enforces approval policy

The Host Bridge SHALL derive approval requirements from capability metadata. mutation.preview and mutation.get_operation bypass approval. mutation.execute SHALL perform canonical validation and private preflight before approval, and SHALL reevaluate after approval. A changed prepared-plan digest SHALL require a new approval.

#### Scenario: Plan changes while approval waits
- **WHEN** post-approval reevaluation produces a different domain plan digest
- **THEN** the original approval SHALL not authorize execution
- **AND** the Bridge SHALL request approval for the newly prepared scope.

#### Scenario: Read command bypasses approval
- **WHEN** an authenticated client performs a read-only action including mutation preview or mutation observation
- **THEN** the bridge SHALL execute it without creating an approval request.

#### Scenario: Preview and download bypass approval
- **WHEN** an authenticated client performs mutation preview or downloads a registered file handle
- **THEN** the bridge SHALL execute it without approval
- **AND** file download SHALL still require a valid authorized handle.

#### Scenario: Workflow submit or mutation execute requires approval
- **WHEN** an authenticated client submits a workflow or executes a mutation
- **THEN** the bridge SHALL require Zotero-side approval before the effect
- **AND** the CLI SHALL not approve the operation itself.
