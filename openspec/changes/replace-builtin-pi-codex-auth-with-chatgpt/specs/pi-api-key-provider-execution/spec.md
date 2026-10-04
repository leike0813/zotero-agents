## ADDED Requirements

### Requirement: SIWC wire follows explicit frozen authentication

ChatGPT execution SHALL use the public Responses endpoint with stream true, store false and complete array input without previous_response_id or system items. Explicit auth variant SHALL govern policy independently of key shape. Unsupported automatic SDK fields SHALL be removed at the final boundary, while explicit unsupported user options SHALL fail before sending.

#### Scenario: SDK late override

- **WHEN** a generated payload reintroduces an unsupported field
- **THEN** the final actual request omits it or rejects the explicit user option before transport

#### Scenario: API key has no customary prefix

- **WHEN** an API-key selection uses a non-sk credential
- **THEN** its supported API parameters remain governed by API-key policy

### Requirement: Actual Responses terminal gates tool effects

SIWC success SHALL require actual response.completed and existing result validation. Incomplete, failed, missing-terminal disconnect, cancellation and timeout SHALL remain distinct structured results. Partial text SHALL remain incomplete. No tool batch SHALL dispatch before successful terminal evidence and complete valid arguments; namespace mapping SHALL preserve Gateway identity.

#### Scenario: Arguments finish before failure

- **WHEN** a tool's arguments are complete but the response fails
- **THEN** no tool effect occurs

#### Scenario: SDK normalizes incomplete as done

- **WHEN** the SDK reports done or length after response.incomplete
- **THEN** the project records incomplete instead of success

### Requirement: SIWC usage and retries retain actual request evidence

SIWC SHALL retain complete, partial or unknown measured usage even on failure and SHALL not price plan use with public API rates. SDK retries SHALL be disabled. Only identified temporary 503 before streamed output SHALL permit at most two bounded retries within the original turn deadline; each actual request SHALL have distinct canonical invocation evidence and no doubled aggregate.

#### Scenario: Failure after output

- **WHEN** a response fails after producing text
- **THEN** partial evidence persists and no automatic retry occurs

#### Scenario: Temporary pre-output failure

- **WHEN** two retryable 503 failures precede a successful request
- **THEN** three actual request identities are recorded under one frozen turn and lease
