## MODIFIED Requirements

### Requirement: Host Bridge submits workflows with explicit input
The system SHALL allow authenticated clients to submit workflow runs only when an explicit raw selection is provided. Host Bridge SHALL perform confirmed Input Planning v2 locally and SHALL route ACP/SkillRunner prepared units through the native Host submission queue after Zotero-side approval.

#### Scenario: Queue-managed workflow submission succeeds
- **WHEN** an authenticated client submits a valid `workflowId`, explicit raw `selection`, optional workflow/provider options, and optional Host queue options for an ACP or SkillRunner workflow
- **THEN** the bridge SHALL validate and confirm the workflow plan, obtain Zotero-side approval, and register the duplicate-approved prepared units as one Host submission
- **AND** it SHALL return HTTP `202` with a queue-managed result containing `submissionId`, workflow/backend identity, unit counts, normalized queue concurrency, permission outcome, and a status URL
- **AND** it SHALL NOT return invented workflow run or job handles before admission

#### Scenario: Direct-provider workflow submission succeeds
- **WHEN** an authenticated client submits a valid Generic HTTP or pass-through workflow
- **THEN** the bridge SHALL preserve its existing direct execution ownership
- **AND** it SHALL return the direct result under a distinct `admission` discriminator

#### Scenario: Missing explicit input is rejected
- **WHEN** an authenticated client submits a workflow without explicit raw selection
- **THEN** the bridge SHALL return a structured validation error
- **AND** it MUST NOT use the current Zotero UI selection as fallback input

#### Scenario: Client uploads planned input
- **WHEN** a client supplies candidates, an input plan, prepared units, or grouping output
- **THEN** Host Bridge SHALL reject that client-owned planning state
- **AND** it SHALL derive the confirmed plan only from the explicit raw selection and live workflow contract

### Requirement: Zotero-managed submission SHALL build allowed prepared units
Host Bridge SHALL confirm one v2 plan and pass each allowed immutable prepared unit to the shared submission seam without rebuilding units from raw selection or flattening them before Host admission.

#### Scenario: One group is refused as duplicate
- **WHEN** a confirmed submission contains multiple prepared units and one grouped unit is refused
- **THEN** Host Bridge SHALL preserve the remaining units unchanged
- **AND** the queue-managed result SHALL report accepted and initially skipped unit counts under one `submissionId`

### Requirement: Host Bridge ownership and return contracts SHALL remain stable
The v2 planner SHALL NOT change self-owned agent-run apply boundaries, Generic HTTP/pass-through queue ownership, or existing run/skill handle types. Zotero-managed queue submissions SHALL use a distinct submission result contract because backend run and job handles do not exist before admission.

#### Scenario: Agent-owned workflow uses v2 manifest
- **WHEN** an agent-owned workflow is described or handed off
- **THEN** its existing ownership and apply-readiness authority remain unchanged

#### Scenario: Caller handles submit result
- **WHEN** a caller receives a workflow submit response
- **THEN** it SHALL branch on `admission = host-queue | direct`
- **AND** each branch SHALL retain a stable schema and typed next handle

## ADDED Requirements

### Requirement: Host Bridge SHALL expose pending queue control
Host Bridge SHALL expose authenticated pending queue listing and pending-only cancellation using opaque queue handles.

#### Scenario: Client lists pending units
- **WHEN** a client lists the workflow queue with optional submission, workflow, backend type, or backend id filters
- **THEN** the response SHALL contain only pending cancelable units with safe labels, member counts, timestamps, and typed handles

#### Scenario: Client cancels a pending unit
- **WHEN** a client cancels a syntactically valid queue id
- **THEN** the response SHALL be `canceled` if the pending transition wins and `not-pending` otherwise
- **AND** the operation SHALL never be redirected to backend run cancellation

### Requirement: Host Bridge SHALL expose active submission inspection
Host Bridge SHALL expose a lightweight active submission view and task filtering by submission identity.

#### Scenario: Client follows a queued submission
- **WHEN** a client reads a known active `submissionId`
- **THEN** the response SHALL combine pending units, admitted units, and matching lightweight task projections
- **AND** it SHALL expose the next valid queue or run handles without private payloads

#### Scenario: Active submission is no longer retained
- **WHEN** a submission completed or process-local state expired
- **THEN** active inspection SHALL report not found or expired
- **AND** the client SHALL use already discovered task/run handles or current live state rather than infer an outcome
