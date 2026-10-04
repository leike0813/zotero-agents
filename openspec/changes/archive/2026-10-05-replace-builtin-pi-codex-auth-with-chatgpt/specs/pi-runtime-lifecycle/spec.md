## MODIFIED Requirements

### Requirement: Restart recovery does not replay uncertain work

Conversations SHALL never auto-dispatch. Waiting and suspended Skill Runs SHALL retain durable states. A previously running Skill Run SHALL auto-continue only with verified safe checkpoint, known effects, immutable resources and restored reservation; ChatGPT work SHALL additionally require task-scoped matching registration consent and current inference admission. Unknown resolution SHALL require explicit continuation.

#### Scenario: Started tool has no receipt

- **WHEN** startup finds an invocation without authoritative completion evidence
- **THEN** the owner retains an unknown recovery hold and neither original tool nor subsequent model work dispatches

#### Scenario: ChatGPT startup lacks consent

- **WHEN** a safe original task has no matching unattended consent
- **THEN** it remains available for explicit continuation without auto-dispatch

## ADDED Requirements

### Requirement: Authentication uses the shared shutdown deadline

Authentication listeners, attempts, refresh/revoke work and pending credential commits SHALL be closed under the existing absolute process deadline. Closing admission SHALL invalidate publication immediately; expiration SHALL not prove physical settlement, revive owners or permit late credential restoration.

#### Scenario: Auth response arrives after shutdown

- **WHEN** a pending response arrives after publication is closed
- **THEN** no registration or credential is restored and shutdown retains bounded uncertainty
