## ADDED Requirements

### Requirement: ACP Skills replay SHALL use standard store seams

ACP Skills replay targets SHALL create run records with `upsertAcpSkillRun`,
route permission events through the standard ACP Skills permission queue,
inspect timers through the generic workspace-data-plane timer seam, and delete
records through the generic hard-delete store API.

#### Scenario: Replay permission request enters the standard queue

- **WHEN** a replay trace contains an ACP Skills permission-request
- **THEN** the replay target SHALL call the standard permission request handler
- **AND** the skill-run store SHALL project the queued permission request

#### Scenario: Replay permission outcome resolves through the standard queue

- **WHEN** a replay trace contains a permission-outcome
- **THEN** the replay target SHALL call the standard permission resolution seam
- **AND** the queued request SHALL be removed in arrival order

#### Scenario: Replay timer inspection is generic

- **WHEN** logical-time replay inspects ACP Skills timers
- **THEN** inspection SHALL use `inspectAcpSkillRunTimers` from the workspace
  data plane
- **AND** `acpSkillRunStore` SHALL NOT re-export a replay-specific timer
  inspector
