## MODIFIED Requirements

### Requirement: Host Bridge exposes a notification inbox

Host Bridge SHALL expose a lightweight bounded notification inbox for workflow and skill-run lifecycle events.

#### Scenario: Runtime state projects notification events

- **WHEN** runtime workflow or skill-run state is projected into the notification inbox
- **THEN** Host Bridge SHALL retain lightweight notification events without transcript access
- **AND** SHALL prune old or excess retained events so the in-memory inbox and deduplication index remain bounded.
