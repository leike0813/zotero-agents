## MODIFIED Requirements

### Requirement: Runtime Option Cache

ACP connection tests MUST cache supported modes, models, and derived reasoning
effort choices from ACP session configuration state.

#### Scenario: Successful probe from config options

- **WHEN** an ACP backend probe succeeds and `session/new` returns select
  `configOptions` for mode, model, or thought level
- **THEN** the backend MUST persist a passing connection test and runtime
  options cache derived from those config options
- **AND** old `modes` / `models` fields MUST remain supported when config
  options are absent.

#### Scenario: Empty or failed refresh preserves existing cache

- **GIVEN** an ACP backend already has a non-empty runtime options cache
- **WHEN** a refresh fails or returns no selectable mode/model data
- **THEN** the backend MUST NOT replace the existing runtime options cache with
  an empty or missing cache.

### Requirement: Workflow Submission Options

ACP Skills workflow submission MUST expose cached mode, model, and reasoning
options for selected ACP backends, regardless of whether the cache originated
from ACP `configOptions` or legacy `modes` / `models`.

#### Scenario: Config option cache drives settings controls

- **GIVEN** a selected ACP backend has cached runtime options derived from
  `configOptions`
- **WHEN** the workflow submit dialog is rendered
- **THEN** the dialog MUST show mode, model, and reasoning controls from the
  cache.
