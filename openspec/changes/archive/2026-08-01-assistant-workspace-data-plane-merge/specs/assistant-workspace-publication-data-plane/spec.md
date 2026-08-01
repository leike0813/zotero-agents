## ADDED Requirements

### Requirement: ACP transcript mirror storage has one shared implementation

The ACP Chat and ACP Skills transcript mirror layers — cold full-mirror LRU,
live/pinned exemption, scheduled hydrate, page-first indexed reads, mirror
event application, event queueing, and streaming text coalescing — SHALL be
served by one shared parameterized store. Per-source variation (owner key
scheme, pin predicate, item-id allocation, streaming segment tracking, plan
handling mode, continuity bookkeeping, not-hydrated queue branch, emission
and persistence callbacks) SHALL be injected as an owner descriptor
keyed by owner source. The shared store SHALL NOT branch on backend id,
provider id, agent family, command name, or backend product strings, and
both sources SHALL keep consuming the shared session-update boundary
classifier. The SkillRunner bounded in-memory mirror stays out of this
store by design.

#### Scenario: A new mirror concern is added

- **WHEN** mirror eviction, hydrate scheduling, or page-read behavior changes
- **THEN** the change is made once in the shared store
- **AND** both ACP sources inherit it through their owner descriptors
  without per-source copies.

#### Scenario: Coalescing semantics stay protocol-level

- **WHEN** an assistant text chunk arrives around a soft side-channel
  update (`tool_call_update`, usage, status, workspace activity)
- **THEN** the shared store coalesces the text segment identically for
  both ACP sources
- **AND** no backend-specific special case exists in the store.

### Requirement: Host action dispatch uses one table keyed by owner source

Host-side Assistant Workspace action routing SHALL have a single entry
that performs envelope validation, owner parsing, registry route
validation, and the selected-owner guard, followed by one dispatch table
keyed by action and owner source. Handler bodies that are shared across
sources SHALL exist exactly once in the table. The action registry and
the typed action contract SHALL remain the vocabulary and payload SSOT;
the dispatch table SHALL NOT introduce action vocabulary outside the
registry. Routes without known senders that are annotated
`TODO(contract)` SHALL be preserved verbatim.

#### Scenario: A cross-source action is handled

- **WHEN** `resolve-permission`, `copy-diagnostics`, `open-workspace`,
  `set-mode`, `set-model`, `set-reasoning-effort`,
  `cancel-queued-workflow-unit`, `open-backend-manager`, or
  `set-execution-display-mode` arrives from any registered source
- **THEN** one shared handler body executes with the source-resolved
  owner context
- **AND** registry validation and owner guards run exactly once at the
  single entry.

#### Scenario: A parked route is touched

- **WHEN** a `TODO(contract)` route is reached
- **THEN** its existing behavior and marker annotation are unchanged.
