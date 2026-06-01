## ADDED Requirements

### Requirement: Workflow apply writes scoped sidecar state directly
Workflow apply hooks SHALL update sidecar cache rows directly for the affected item, topic, artifact, or approved decision.

#### Scenario: Literature digest apply succeeds
- **WHEN** a literature digest result is applied for one Zotero item
- **THEN** the host SHALL update that item's artifact projection, reference entries, and matching metadata sidecar rows
- **AND** it SHALL NOT record dirty events or enqueue worker work.

### Requirement: Startup does not reconcile Synthesis cache
Plugin startup SHALL NOT scan Zotero Library to reconcile sidecar cache or enqueue follow-up Synthesis work.

#### Scenario: Plugin starts with existing sidecar state
- **WHEN** Synthesis initializes
- **THEN** it SHALL open the sidecar repository and expose cache status
- **AND** it SHALL NOT run startup reconcile, dirty fan-out, or worker drain.

## REMOVED Requirements

### Requirement: Synthesis updates are event driven
**Reason**: Automatic dirty events are the old synchronization model being removed.
**Migration**: Apply hooks write scoped sidecar rows directly; broad work is explicit cache refresh.

### Requirement: Startup reconcile is lightweight
**Reason**: Startup reconcile still scans Zotero Library and fans out synchronization work.
**Migration**: Startup exposes existing cache status only; users run explicit inspect or refresh when needed.

### Requirement: Background workers are budgeted and pausable legacy dirty scopes
**Reason**: Dirty-scope workers are replaced by explicit operation execution.
**Migration**: Use explicit operation progress and cancellation for user-triggered work.

### Requirement: Full rebuilds are explicit repair actions
**Reason**: Full Registry rebuild semantics are removed with the independent Registry fact source.
**Migration**: Use scoped reference sidecar refresh or citation graph cache refresh.

### Requirement: Synthesis updates are WorkItem driven
**Reason**: WorkItems preserve the background queue model.
**Migration**: Use explicit operation records only.

### Requirement: Startup reconcile is WorkItem governed
**Reason**: Wrapping startup reconcile in WorkItems still keeps startup reconciliation.
**Migration**: Do not run startup reconcile.

### Requirement: Background workers are budgeted and pausable
**Reason**: Claimable owner queues are removed.
**Migration**: Explicit operations run in bounded slices and store progress directly.
