## MODIFIED Requirements

### Requirement: Host Bridge exposes agent-owned workflow handoff and apply-back

Host Bridge SHALL let authenticated agents prepare workflow handoff context and
later submit finalized local SkillRunner-style bundles for explicit apply-back.

#### Scenario: Agent-run prepares request context without backend dispatch

- **WHEN** Host Bridge receives a valid workflow agent-run request
- **THEN** it SHALL build prepared workflow requests from the explicit selection
- **AND** it SHALL return `agentRunId`, `expiresAt`, and lightweight request metadata
- **AND** it SHALL include prepared request context in the handoff bundle
- **AND** it SHALL NOT dispatch backend jobs or apply workflow results.

#### Scenario: Agent-run apply-back applies a finalized bundle once

- **WHEN** an authenticated client submits finalized result bundles for a known
  unexpired `agentRunId`
- **THEN** Host Bridge SHALL validate each bundle against its stored request namespace
- **AND** it SHALL re-evaluate current apply readiness before requesting approval
- **AND** it SHALL request Zotero-side write approval before invoking `applyResult`
- **AND** it SHALL seal the agent-run record before side effects begin
- **AND** it SHALL reject later apply attempts for the same `agentRunId`.

#### Scenario: Apply-back rejects invalid state

- **WHEN** the agent run is unknown, expired, already consumed, references an
  unknown request id, supplies an invalid bundle, or current apply readiness is
  not allowed
- **THEN** Host Bridge SHALL return a stable structured error
- **AND** it SHALL NOT invoke `applyResult`.
