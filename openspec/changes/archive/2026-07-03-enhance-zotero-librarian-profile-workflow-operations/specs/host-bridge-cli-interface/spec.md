## ADDED Requirements

### Requirement: Zotero Librarian helper scripts SHALL use canonical CLI commands

Profile helper scripts SHALL call canonical `zotero-bridge` command groups and
SHALL NOT introduce alternate Host Bridge command surfaces.

#### Scenario: Workflow helper calls Host Bridge

- **WHEN** the workflow helper reads context, validates workflow input, submits
  a Host-owned workflow, or creates an agent-owned handoff
- **THEN** it SHALL use canonical `context`, `library`, `workflow`, and `run`
  commands.

#### Scenario: Notification helper calls Host Bridge

- **WHEN** the notification helper syncs or acknowledges inbox events
- **THEN** it SHALL use `run notification list` and `run notification ack`
- **AND** SHALL NOT use `run notification wait` for scheduled monitoring.
