## ADDED Requirements

### Requirement: CLI SHALL expose native workflow submission queue controls
The canonical Rust CLI and generated Agent Surface SHALL expose Host queue list, pending cancellation, active submission inspection, and submission-scoped task discovery as distinct typed operations.

#### Scenario: Agent submits with Host options
- **WHEN** an agent invokes `workflow submit --host-options` with JSON, file, stdin, or `@file` input
- **THEN** the CLI SHALL send top-level `hostOptions`
- **AND** it SHALL NOT merge Host queue policy into workflow parameters or provider options

#### Scenario: Agent manages pending work
- **WHEN** an agent invokes `workflow queue list` or `workflow queue cancel <queueId>`
- **THEN** the CLI SHALL call the canonical queue endpoints and preserve the queue result schema

#### Scenario: Agent follows submission admission
- **WHEN** an agent invokes `workflow submission get <submissionId>` or `run list --submission <submissionId>`
- **THEN** the CLI SHALL use the opaque submission handle without parsing or converting it to a workflow run id

### Requirement: Generated command guidance SHALL describe submission handle transitions
The Agent Surface command cards SHALL distinguish queue, submission, workflow-run, and skill-run handles and SHALL describe approvals, state effects, completion evidence, and safe recovery for every new command.

#### Scenario: Queue command card is rendered
- **WHEN** governed command references are generated
- **THEN** every new leaf command SHALL include invocation schema, payload/result fields, effect, approval boundary, handle transitions, next action, and failure recovery
