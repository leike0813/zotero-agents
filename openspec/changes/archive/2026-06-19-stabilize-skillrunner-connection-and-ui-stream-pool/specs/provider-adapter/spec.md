## ADDED Requirements

### Requirement: SkillRunner HTTP requests MUST use governed connection lanes

SkillRunner provider and management HTTP calls SHALL use application-level
connection governance instead of relying on implicit browser connection pools.

#### Scenario: submit requests keep priority

- **WHEN** SkillRunner creates or uploads a backend job
- **THEN** those requests SHALL run in the `submit` lane
- **AND** background, maintenance, and stream work SHALL NOT consume the final
  submit-reserved backend slot

#### Scenario: pre-ready dispatch failure is not recoverable

- **WHEN** `/v1/jobs` has returned a request id but upload or request
  initialization fails before `request-ready`
- **THEN** the provider dispatch SHALL fail the workflow job
- **AND** the job SHALL NOT be reported as a recoverable backend-owned pending
  run
- **AND** runtime logs SHALL include the request id and a pre-ready failure
  stage for audit

#### Scenario: submit requests are bounded by timeout

- **WHEN** SkillRunner create or upload does not complete
- **THEN** the submit request SHALL be aborted by a bounded request timeout
- **AND** the workflow job SHALL settle failed rather than remaining silently
  in-flight

#### Scenario: terminal settlement uses settlement lane

- **WHEN** SkillRunner terminal success requires `/result` or `/bundle`
- **THEN** result and bundle requests SHALL run in the `settlement` lane
- **AND** settlement failure SHALL NOT block later submit requests

#### Scenario: UI chat streams use a bounded stream pool

- **WHEN** RunDialog opens `/chat` SSE for SkillRunner runs on one backend
- **THEN** those streams SHALL run in the `foreground-stream` lane
- **AND** no more than two distinct request ids SHALL hold active foreground
  streams for that backend

### Requirement: SkillRunner SSE parsing MUST support standard frame endings

SkillRunner management SSE parsing SHALL handle both LF and CRLF empty-line
frame boundaries.

#### Scenario: CRLF-delimited frames are emitted

- **WHEN** a SkillRunner SSE response uses `\r\n\r\n` between frames
- **THEN** the management client SHALL emit each frame without waiting for the
  stream to close
- **AND** aborting the stream SHALL release the governed connection slot
