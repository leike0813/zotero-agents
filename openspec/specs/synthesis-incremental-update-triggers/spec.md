## Purpose

Synthesis update triggers are direct sidecar writes and explicit refresh operations, not automatic dirty-event fan-out.

## Requirements

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
