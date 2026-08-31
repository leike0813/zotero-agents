## ADDED Requirements

### Requirement: Platform-sensitive callers SHALL consume owned runtime seams
Production modules that need ordinary filesystem or general runtime/Window resolution SHALL consume `runtimePersistence` or `runtimeBridge`. Command policy, environment policy, and approved native workloads SHALL remain with their named owners and MUST NOT form a new generic runtime facade.

#### Scenario: Provider reads a managed file
- **WHEN** a production provider reads or writes ordinary managed content
- **THEN** it delegates filesystem adapter selection to runtime persistence

#### Scenario: Native workload needs a native object
- **WHEN** ZIP, SQLite, script loading, streaming transfer, picker, attachment creation, or an approved diagnostic requires native semantics
- **THEN** the named owner keeps a private internal seam and does not widen runtime persistence or Workflow Host with a native object
