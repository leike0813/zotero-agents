## ADDED Requirements

### Requirement: Recovered prompt settlement is selected by controller purpose

The ACP SkillRunner-compatible runner SHALL reuse common recovered-session
transport, transcript, timeout, permission, interrupt, force-stop, and disconnect
machinery while selecting either workflow settlement or post-terminal
conversation settlement from a process-local controller purpose.

#### Scenario: Workflow recovery retains guarded settlement

- **GIVEN** a waiting_user or failed_retriable run resumes
- **WHEN** the user replies
- **THEN** the runner SHALL preserve workflow continuation guards, output
  convergence, result validation, sequence continuation, and apply behavior.

#### Scenario: Terminal recovery uses conversation-only settlement

- **GIVEN** explicit Connect installed a post-terminal-conversation controller
- **WHEN** a prompt settles normally or abnormally
- **THEN** the runner SHALL update only conversation-owned prompt, permission,
  transcript, usage, connection, recovery, and reply-error data
- **AND** it SHALL not call any workflow result or apply seam.

### Requirement: Terminal projection is task-first

ACP Skills task projection SHALL evaluate terminal task and apply evidence before
conversation permission, prompt, pending interaction, convergence, or reply
error evidence.

#### Scenario: Permission does not reopen completed task

- **GIVEN** a succeeded run has a post-terminal prompt awaiting permission
- **WHEN** task state is projected
- **THEN** the task SHALL remain terminal and completed
- **AND** prompt activity SHALL be exposed only through conversation controls.

#### Scenario: Conversation error does not replace failed task error

- **GIVEN** a failed run retains a business error and a later terminal reply
  fails
- **WHEN** task and conversation data are projected
- **THEN** task liveness SHALL remain failed with the business error
- **AND** the later failure SHALL appear only as conversation or reply error.
