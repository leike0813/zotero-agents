## ADDED Requirements

### Requirement: Host Bridge SHALL project input and validation contracts separately
Workflow list, describe, validate, and apply-readiness projections SHALL expose `inputs` and `validateSelection` as distinct v2 fields and SHALL NOT synthesize a mixed `inputUnit` field.

#### Scenario: Agent describes a workflow
- **WHEN** Host Bridge returns workflow contract metadata
- **THEN** member/grouping consumption and selection/candidate production are independently inspectable

### Requirement: Zotero-managed submission SHALL build allowed prepared units
Host Bridge SHALL confirm one v2 plan, independently build each allowed prepared unit, and join those builds into the existing single `workflowRunId` batch without rebuilding units from raw selection.

#### Scenario: One group is refused as duplicate
- **WHEN** a confirmed batch contains multiple prepared units and one grouped unit is refused
- **THEN** Host Bridge builds the remaining unchanged units and retains one workflow run batch identity

### Requirement: Host Bridge ownership and return contracts SHALL remain stable
The v2 planner SHALL NOT change self-owned agent-run apply boundaries, Generic HTTP/pass-through queue ownership, workflow submission return DTOs, or handle types.

#### Scenario: Agent-owned workflow uses v2 manifest
- **WHEN** an agent-owned workflow is described or handed off
- **THEN** its existing ownership and apply-readiness authority remain unchanged
