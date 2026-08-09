## ADDED Requirements

### Requirement: Terminal task and ACP conversation lifecycles are independent

ACP Skills SHALL treat `succeeded` and `failed` workflow task status as absorbing
on the task axis while allowing a separately recoverable conversation on the
original ACP session. Eligibility SHALL be derived by one classifier and SHALL
NOT be persisted as a run-record field.

#### Scenario: Eligible succeeded run can reconnect

- **GIVEN** a non-archived succeeded run has an original session, completed apply
  evidence or a legacy missing apply-state field, no workflow-open evidence, and
  a conversation that is neither ended nor unsupported
- **WHEN** the user explicitly selects Connect
- **THEN** ACP Skills SHALL resume that original session without sending a prompt
- **AND** the task SHALL remain succeeded.

#### Scenario: Eligible failed run can reconnect

- **GIVEN** a non-archived failed run has an original session, no workflow-open
  evidence, and a conversation that is neither ended nor unsupported
- **WHEN** the user explicitly selects Connect
- **THEN** ACP Skills SHALL negotiate resume or load for that session
- **AND** the original business error and failed task status SHALL remain intact.

#### Scenario: Ineligible terminal run remains closed

- **GIVEN** a run is canceled, failed_retriable, archived, ended, unavailable,
  unsupported, missing its session, or retains workflow-open evidence
- **WHEN** terminal conversation controls are derived
- **THEN** ACP Skills SHALL NOT offer post-terminal Connect or Reply.

### Requirement: Post-terminal prompts are ordinary ACP conversation turns

After explicit Connect, ACP Skills SHALL send the user's original text directly
as the prompt and SHALL retain normal ACP transcript, tool call, permission,
usage, interrupt, force-stop, timeout, and disconnect behavior. Reply SHALL NOT
implicitly connect a detached terminal run.

#### Scenario: Completion marker is ordinary transcript content

- **GIVEN** an eligible terminal run is connected for ordinary conversation
- **WHEN** the user replies and the agent emits valid `__SKILL_DONE__` JSON
- **THEN** ACP Skills SHALL record the response in the transcript
- **AND** it SHALL NOT validate or repair workflow output, write a result, advance
  a sequence, or apply output.

#### Scenario: Terminal conversation can use tools and permissions

- **GIVEN** a post-terminal prompt requests an ACP tool call that requires an
  existing Host Bridge permission decision
- **WHEN** the permission flow settles
- **THEN** the existing tool and permission policy SHALL apply
- **AND** the conversation SHALL not be restricted to read-only behavior merely
  because its workflow task is terminal.

#### Scenario: Terminal prompt failure preserves task evidence

- **GIVEN** an eligible succeeded or failed run is connected
- **WHEN** its prompt errors, is denied, interrupted, force-stopped, or times out
- **THEN** status, backend status, apply evidence, result, output revisions,
  workflow tasks, sequence state, and business error SHALL remain unchanged
- **AND** any prompt failure SHALL be recorded only on conversation or reply
  error state.

### Requirement: Terminal conversation bypasses workflow admission

Post-terminal Connect and Reply SHALL NOT acquire a submission slot, enter
resumption-pending, or participate in output convergence, apply, or sequence
continuation.

#### Scenario: Intermediate terminal sequence step converses concurrently

- **GIVEN** a sequence step has itself reached eligible terminal state while a
  later step is executing
- **WHEN** the user connects and converses with the terminal step
- **THEN** the terminal conversation SHALL proceed without a submission slot
- **AND** later steps, slot counts, and sequence state SHALL remain unchanged.

### Requirement: Initial controllers never become post-terminal controllers

Every controller created by initial workflow execution SHALL retain workflow
purpose until it is detached. Only explicit terminal Connect SHALL create a
post-terminal-conversation controller.

#### Scenario: Apply-to-detach race rejects terminal reply

- **GIVEN** workflow apply has made the run terminal but the original controller
  has not yet detached
- **WHEN** a reply is attempted through that controller
- **THEN** the reply SHALL be rejected until explicit Connect installs a new
  post-terminal controller.
