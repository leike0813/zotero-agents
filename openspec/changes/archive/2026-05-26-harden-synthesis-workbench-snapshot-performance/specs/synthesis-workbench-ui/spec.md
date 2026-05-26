## ADDED Requirements

### Requirement: Workbench snapshots avoid full service reads for local UI state

Synthesis Workbench SHALL cache the latest service snapshot input and SHALL use
that cache for local UI state changes.

#### Scenario: A filter changes

- **WHEN** the user changes a Workbench filter, selected tab, selected graph
  element, selected tag, selected concept, overlay state, or review merge target
- **THEN** the Workbench SHALL rebuild the UI snapshot from cached snapshot input
- **AND** it SHALL NOT call the Synthesis service full snapshot reader.

#### Scenario: A host command completes

- **WHEN** a host command mutates canonical data or explicitly requests refresh
- **THEN** the Workbench SHALL refresh cached snapshot input from the Synthesis
  service before rendering the next snapshot.

### Requirement: Workbench startup posts one initial snapshot

Synthesis Workbench SHALL send a single real initial snapshot after the bridge is
ready.

#### Scenario: The Workbench handshake completes

- **WHEN** the Workbench bridge handshake completes
- **THEN** the host SHALL post one `synthesis:init` snapshot
- **AND** it SHALL NOT first post a default placeholder snapshot followed by a
  second real snapshot.

### Requirement: Workbench uses optimized chrome icons

Synthesis-related chrome toolbar, menu, and progress window icons SHALL use
small icon assets.

#### Scenario: Small icon URI is resolved

- **WHEN** toolbar, menu, or progress window code resolves play, workbench, or
  sidebar icons
- **THEN** the URI SHALL point to a 32px PNG asset
- **AND** it SHALL NOT point to the retained high-resolution source PNG.
