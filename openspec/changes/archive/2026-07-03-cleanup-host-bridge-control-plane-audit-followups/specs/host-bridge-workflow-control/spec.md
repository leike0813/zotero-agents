## MODIFIED Requirements

### Requirement: Host Bridge exposes a notification inbox

Host Bridge SHALL expose a lightweight bounded notification inbox for workflow and skill-run lifecycle events.

#### Scenario: Notification projection avoids repeated broad history scans

- **WHEN** clients list notifications with workflow or skill-run filters
- **THEN** Host Bridge SHALL project only the requested run scope
- **AND** unfiltered broad history projection SHALL be gated so polling does not repeatedly scan full history.
