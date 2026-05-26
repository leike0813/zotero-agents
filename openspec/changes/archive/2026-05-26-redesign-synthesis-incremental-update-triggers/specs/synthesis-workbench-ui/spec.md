## ADDED Requirements

### Requirement: Workbench reads do not trigger rebuilds

Synthesis Workbench snapshot reads and pure UI actions SHALL NOT enqueue
registry, graph, metrics, layout, or Git Sync jobs.

#### Scenario: Workbench opens with stale registry

- **WHEN** the Workbench snapshot reads stale registry state
- **THEN** it SHALL display latest usable data and freshness diagnostics
- **AND** it SHALL NOT enqueue registry rebuild work.

#### Scenario: User changes a local filter

- **WHEN** the user changes a tab, filter, selected row, graph mode, or local
  inspector state
- **THEN** the Workbench SHALL rebuild UI state from cached snapshot input where
  possible
- **AND** it SHALL NOT call maintenance workers.

### Requirement: Workbench displays Synthesis maintenance state

The Workbench SHALL expose freshness, queue, worker, latest usable age, and
recommended explicit actions for Synthesis maintenance domains.

#### Scenario: Registry work is queued

- **WHEN** Paper Registry dirty scopes are queued
- **THEN** Workbench SHALL show queued/running/stale status and pending count.

#### Scenario: Graph layout is stale

- **WHEN** Citation Graph structure is ready but layout is stale
- **THEN** Graph UI SHALL show latest usable graph data
- **AND** expose an explicit or graph-view-triggered layout refresh state.
