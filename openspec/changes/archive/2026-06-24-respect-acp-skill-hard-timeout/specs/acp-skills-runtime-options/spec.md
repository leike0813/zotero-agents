## MODIFIED Requirements

### Requirement: Workflow Submission Options

ACP Skills workflow submission MUST expose cached mode, model, and reasoning
options for selected ACP backends, regardless of whether the cache originated
from ACP `configOptions` or legacy `modes` / `models`. ACP workflow submission
MUST also expose a positive integer Job Timeout option that maps to
`runtime_options.hard_timeout_seconds`, uses the shared provider option schema,
and shows a localized placeholder indicating the default timeout is 1200
seconds. Submit-time provider runtime options are execution-context overrides:
when present, they take precedence over same-named runtime option values already
compiled into the request payload.

#### Scenario: Config option cache drives settings controls

- **GIVEN** a selected ACP backend has cached runtime options derived from
  `configOptions`
- **WHEN** the workflow submit dialog is rendered
- **THEN** the dialog MUST show mode, model, and reasoning controls from the
  cache.

#### Scenario: ACP provider exposes Job Timeout option

- **WHEN** ACP provider runtime options are described
- **THEN** the schema SHALL include `hard_timeout_seconds`
- **AND** the option title SHALL be `Job Timeout (sec)`
- **AND** the option placeholder SHALL indicate the default is `1200` seconds.

#### Scenario: ACP provider normalizes Job Timeout

- **WHEN** ACP provider runtime options are normalized
- **THEN** a positive integer `hard_timeout_seconds` value SHALL be preserved
- **AND** non-positive or non-numeric values SHALL be omitted.

#### Scenario: Submit-time Job Timeout overrides request payload

- **GIVEN** a workflow request payload already contains
  `runtime_options.hard_timeout_seconds`
- **AND** the submit-time provider options contain a positive integer
  `hard_timeout_seconds`
- **WHEN** ACP workflow execution prepares the effective request/runtime options
- **THEN** the submit-time provider option value SHALL take precedence.

#### Scenario: Workflow option surfaces reuse provider schema placeholder

- **GIVEN** an ACP backend is selected for workflow execution
- **WHEN** workflow options or the workflow submit dialog render provider
  runtime options
- **THEN** the Job Timeout input SHALL be rendered from the provider option
  schema
- **AND** it SHALL show the localized default-timeout placeholder
- **AND** no ACP-specific UI branch SHALL be required to show that field.
