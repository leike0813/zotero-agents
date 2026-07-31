## ADDED Requirements

### Requirement: SkillRunner read model projects into region publications

The SkillRunner run workspace SHALL expose a read model (change
subscription, per-owner region reads, paged transcript reads, and
navigation summaries) and a stateless surface adapter that maps read-model
changes to publication kinds. The adapter SHALL support the kinds
SkillRunner renders (owner navigation, owner control, message counts,
transcript, permission, composer, owner presentation, owner details) and
SHALL declare `plan` as not applicable. Full region projections with
unchanged payloads SHALL be absorbed by coordinator signature dedup.

#### Scenario: A run store change republishes only affected regions

- **GIVEN** the SkillRunner surface adapter is scheduled with a run change
- **WHEN** only the run's status metadata changed
- **THEN** owner-control and owner-presentation publications are produced
- **AND** kinds whose projected payload is unchanged are dropped by signature dedup.

### Requirement: SkillRunner conversation entries project to canonical transcript items

SkillRunner conversation entries SHALL be projected to canonical
transcript items producer-side: user and assistant messages to `message`
items, `assistant_revision` to a `message` item carrying revision
metadata, reasoning-like `assistant_process` entries to `thought` items,
`assistant_process` entries of type `tool_call` or `command_execution` to
`tool-call` items, and pending permission prompts to `permission` items.
The child SHALL NOT apply SkillRunner-specific transcript normalization.

#### Scenario: Legacy entry kinds render through the canonical renderer

- **WHEN** a SkillRunner transcript page contains thinking, tool, revision, and final entries
- **THEN** each entry arrives at the child as its canonical item kind
- **AND** no legacy item adaptation runs in the child.

### Requirement: SkillRunner transcript reads are page first

SkillRunner transcript pages SHALL be served from the bounded in-memory
session history. Selecting a run SHALL render the first available page
without waiting for full history hydration, and background hydration
completion SHALL surface as a later transcript snapshot. SkillRunner SHALL
NOT persist a separate UI transcript store and SHALL NOT maintain a cold
full-mirror cache layer.

#### Scenario: A finished run is selected

- **GIVEN** a finished SkillRunner run whose history is not loaded
- **WHEN** the user selects the run
- **THEN** the transcript renders loading first, then the first hydrated page
- **AND** remaining history arrives through subsequent snapshots.

### Requirement: SkillRunner run semantics are preserved end to end

Convergence SHALL preserve SkillRunner run behavior: waiting_user and
terminal status semantics, pending interaction replies, authentication
prompts including file import, permission grant/deny, cancel and archive
lifecycle, optimistic task selection, the panel history limit with its
truncation notice, and assistant revision/replacement audit trails.

#### Scenario: A waiting auth run keeps its auth affordances

- **GIVEN** a SkillRunner run waiting on authentication
- **WHEN** the run renders through the publication plane
- **THEN** the hint and composer expose the same auth input and file import affordances as before
- **AND** submitting an auth response reaches the same host handler.

### Requirement: SkillRunner UI actions route through the typed action registry

SkillRunner child-to-host actions SHALL be typed members of the shared
action registry with compile-time drift guards, routed over the shared
child action channel. The legacy SkillRunner action vocabulary, legacy
bridge key, and legacy snapshot wire contract SHALL be removed.

#### Scenario: A SkillRunner action envelope reaches the host

- **WHEN** the child sends a SkillRunner action such as reply-run or resolve-permission
- **THEN** the host parses it as a typed registry action scoped to the skillrunner source
- **AND** unknown or out-of-scope actions are rejected before dispatch.
