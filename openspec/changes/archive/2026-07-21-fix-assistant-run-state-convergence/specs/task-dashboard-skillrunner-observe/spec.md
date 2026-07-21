## MODIFIED Requirements

### Requirement: Selected SkillRunner run observation SHALL converge without reselection

The selected run observer SHALL own management status, pending state, chat history, and the foreground chat stream. A selected queued or running run SHALL attach or retry its stream without requiring task navigation. A successful interaction reply SHALL rearm the same observer, and stale state for the answered interaction SHALL NOT restore waiting.

#### Scenario: Initial queued run starts producing chat

- **GIVEN** a selected run is locally queued and the backend advances to running
- **WHEN** chat events become available
- **THEN** the selected transcript advances without a task-selection action.

#### Scenario: Answered waiting interaction continues

- **GIVEN** a selected run is waiting for interaction
- **WHEN** its reply is accepted and an older waiting projection arrives
- **THEN** the continuation remains active
- **AND** later chat events appear without reselection.

#### Scenario: Stream reconnect covers the abort window

- **WHEN** a selected foreground stream closes or is aborted
- **THEN** the observer catches up history after its last sequence before reconnecting
- **AND** transcript events remain ordered and unique.

### Requirement: Task cards SHALL expose one shared status projection

ACP Skills and SkillRunner task cards SHALL use the same main, Backend, and Apply status projection. Explicit backend and apply states SHALL take priority over display fallbacks. A missing backend state SHALL use the main state; a missing apply state SHALL use `not-required` for a successful task and `idle` otherwise. Backend or apply failure SHALL be eligible to promote the projected main state to failed.

SkillRunner sidebar card materialization SHALL preserve persisted Backend and Apply status, error, and retry facts from the lightweight run projection for unselected runs. The selected full run record SHALL take priority when available. Sidebar card construction SHALL NOT require a full-record read for every run.

#### Scenario: ACP Skills status facts are absent

- **WHEN** an ACP Skills task has no explicit backend or apply state
- **THEN** its card still shows Backend and Apply axes
- **AND** the axes use the main-state and apply-state fallbacks from the shared task status projection.

#### Scenario: Explicit task-axis failure wins

- **WHEN** a task has an explicit failed backend or apply state
- **THEN** that explicit axis state and error tone are shown
- **AND** the projected main state is failed.

#### Scenario: Selection moves between persisted SkillRunner runs

- **GIVEN** selected and unselected runs have persisted succeeded, skipped, or failed Apply states
- **WHEN** the selected task changes
- **THEN** every card preserves its persisted Backend and Apply axes
- **AND** Backend succeeded, Apply failed, and Main failed remain independently visible
- **AND** unselected cards continue to use the lightweight projection.
