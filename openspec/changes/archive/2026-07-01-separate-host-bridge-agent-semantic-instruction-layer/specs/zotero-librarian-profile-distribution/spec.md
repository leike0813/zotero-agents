## MODIFIED Requirements

### Requirement: Zotero Librarian profile SHALL include semantic operating principles

The Zotero Librarian profile SHALL provide agent-facing operating principles in
addition to generated Host Bridge command references.

#### Scenario: Agent inspects or maintains a library

- **WHEN** an agent reads the Zotero Librarian skill
- **THEN** it SHALL be told to use the local SQLite index for repeated search,
  ranking, and triage
- **AND** it SHALL be told to use direct Host Bridge reads for bounded real-time
  confirmation of specific Zotero items or notes
- **AND** it SHALL be told that scheduled jobs are read-only unless a current
  workflow explicitly grants approval.

#### Scenario: Agent chooses workflow execution path

- **WHEN** an agent considers a workflow action
- **THEN** the profile SHALL tell it to choose between `workflow submit`,
  `workflow agent-run`, and `workflow agent-apply` based on ownership, write
  intent, approval needs, and result-bundle readiness
- **AND** it SHALL state that only Host-owned `workflow submit` runs are
  registered with `run-register` and monitored with `run-watch`.

### Requirement: Profile business logic SHALL use canonical Host Bridge CLI namespaces

Cron files and profile business logic SHALL use the canonical Host Bridge CLI
surface.

#### Scenario: Profile checks scan cron YAML

- **WHEN** profile checks inspect cron YAML files
- **THEN** any `zotero-bridge` command argv SHALL be validated against canonical
  top-level namespaces
- **AND** stale top-level namespaces such as `insights`, `topics`, `task`, or
  `skill-run` SHALL fail the check.

#### Scenario: Attention queue cron runs

- **WHEN** the attention-queue cron command is rendered
- **THEN** it SHALL invoke `zotero-bridge synthesis insight attention-queue`.
