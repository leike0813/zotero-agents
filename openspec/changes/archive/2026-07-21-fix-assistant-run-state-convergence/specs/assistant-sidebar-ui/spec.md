## ADDED Requirements

### Requirement: ACP task drawer status axes SHALL be source-aware and localized

ACP Chat and ACP Skills task drawers SHALL use the shared task status projection and shared Assistant status labels. ACP Skills SHALL show Backend and Apply axes for every task. ACP Chat SHALL show Backend and SHALL hide Apply. Presentation fallbacks SHALL NOT replace nullable `backendStatus` or `applyState` facts in owner-navigation publications.

#### Scenario: ACP Chat task omits explicit axis states

- **WHEN** an ACP Chat task has no explicit backend or apply state
- **THEN** its Backend axis uses the projected main state
- **AND** its Apply axis remains hidden.

#### Scenario: ACP drawer labels use the active locale

- **WHEN** localized shared `status.backend`, `status.apply`, and `status.overall` labels are provided
- **THEN** ACP drawer task axes use those labels
- **AND** the renderer does not expose its English fallback.

#### Scenario: Task status changes preserve unrelated managed regions

- **WHEN** only an ACP drawer task status changes
- **THEN** the task drawer updates through its own stable signature
- **AND** transcript, toolbar, banner, plan, hint, reply, details, and permission regions preserve DOM identity.
