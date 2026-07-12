## ADDED Requirements

### Requirement: ACP Chat cancellation distinguishes request from completion

ACP Chat SHALL keep an active prompt busy after sending `session/cancel` and SHALL expose a requested interruption state until the original `session/prompt` settles or the owned adapter is force-closed.

#### Scenario: Cancellation notification is written while prompt remains active
- **WHEN** the user cancels an in-flight ACP Chat prompt
- **AND** the cancellation notification is written successfully
- **THEN** the conversation MUST remain busy
- **AND** a second prompt or cancellation MUST remain disabled
- **AND** the interruption state MUST be `requested`.

#### Scenario: Agent confirms cancellation
- **WHEN** the original prompt returns `stopReason: "cancelled"`
- **THEN** ACP Chat MUST set the interruption state to `confirmed`
- **AND** it MUST finish the prompt without closing the adapter.

#### Scenario: Agent completes with another result
- **WHEN** cancellation was requested
- **AND** the original prompt returns a non-cancelled result
- **THEN** ACP Chat MUST preserve that result and stop reason
- **AND** it MUST set the interruption state to `unconfirmed`.

### Requirement: ACP Chat cancellation has a bounded force-stop fallback

ACP Chat SHALL close only the active conversation's adapter and process tree when its cancellation remains unconfirmed for 10 seconds.

#### Scenario: Cancellation grace period expires
- **WHEN** the original prompt remains unsettled for 10 seconds after cancellation was requested
- **THEN** ACP Chat MUST close the active conversation adapter
- **AND** it MUST set the interruption state to `forced`
- **AND** other conversation adapters MUST remain unaffected.

#### Scenario: Force-stopped conversation is used again
- **WHEN** the user sends another prompt after a force-stop
- **THEN** ACP Chat MUST create a new adapter
- **AND** it MUST try resume, then load, then new-session fallback using the existing recovery policy.

#### Scenario: Cancellation notification cannot be written
- **WHEN** the client cannot write `session/cancel` to the active connection
- **THEN** ACP Chat MUST enter the force-stop cleanup path without waiting for the grace period.

### Requirement: ACP Chat cancellation resolves pending permission requests

ACP Chat SHALL answer a pending ACP permission request with the cancelled outcome before requesting prompt cancellation.

#### Scenario: Cancel is selected during a permission request
- **WHEN** an active prompt has a pending ACP permission request
- **AND** the user cancels the prompt
- **THEN** the pending permission request MUST be resolved as cancelled
- **AND** prompt cancellation MUST continue through the same interruption lifecycle.
