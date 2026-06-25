## MODIFIED Requirements

### Requirement: Workflow runtime executes skillrunner sequences serially

The workflow runtime SHALL execute `skillrunner.sequence.v1` requests step by
step and SHALL not enqueue sequence steps as independent parallel workflow
jobs.

#### Scenario: Steps run in declaration order

- **WHEN** a sequence request contains multiple steps
- **THEN** the runtime SHALL launch the first step
- **AND** it SHALL launch each downstream step only after the upstream step
  returns a non-deferred successful result.

#### Scenario: Opt-in successful step applies before downstream execution

- **GIVEN** a sequence step declares `apply_result`
- **WHEN** that step returns a successful provider result
- **THEN** the runtime SHALL invoke the declared workflow `applyResult` before
  launching the next step
- **AND** the runtime SHALL record that step apply status in sequence state.

#### Scenario: Step apply failure continues by default

- **GIVEN** a sequence step declares `apply_result`
- **AND** it does not declare `on_failure = "fail_sequence"`
- **WHEN** the step `applyResult` fails
- **THEN** the runtime SHALL record the apply failure
- **AND** downstream sequence steps SHALL continue.

#### Scenario: Undeclared intermediate steps do not apply

- **WHEN** an intermediate sequence step does not declare `apply_result`
- **THEN** workflow `applyResult` SHALL NOT run for that intermediate step.

#### Scenario: Final step apply is not duplicated

- **GIVEN** the declared final sequence step declares `apply_result`
- **WHEN** the foreground apply seam processes the completed sequence job
- **THEN** it SHALL NOT invoke the parent workflow apply hook again for the
  final result.

#### Scenario: A sequence step cannot continue

- **WHEN** a sequence step fails, is canceled, or returns deferred
- **THEN** the runtime SHALL NOT launch downstream steps.

#### Scenario: Deferred ACP step does not run workflow apply

- **GIVEN** an ACP-backed workflow step returns a deferred recoverable result
- **WHEN** foreground workflow apply processes the provider result
- **THEN** workflow `applyResult` SHALL NOT run
- **AND** the workflow task SHALL remain pending rather than being marked
  applied successfully.
