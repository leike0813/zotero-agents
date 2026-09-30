# Spec Delta

## Purpose

Allows a user to connect an OpenAI Codex subscription to the Built-in Pi Agent Runtime through a bounded device-code flow and execute the selected Codex model with profile-owned credentials.

## ADDED Requirements

### Requirement: Codex device authorization is user initiated and bounded

The system SHALL start Codex device authorization only on a user action, display the verification address and one-time code, honor the server polling interval, and terminate on cancellation or expiry. Failure SHALL NOT replace an existing credential.

#### Scenario: User completes device authorization
- **WHEN** a user starts device authorization and completes the verification step before expiry
- **THEN** the system stores the returned access and refresh material in the encrypted profile credential store and publishes only redacted account status

#### Scenario: Authorization is canceled or expires
- **WHEN** the user cancels authorization, closes its owning dialog, or the device code expires
- **THEN** polling stops and any previously saved credential remains unchanged

### Requirement: Codex credential refresh is isolated and atomic

The system SHALL resolve only the selected Codex credential, refresh it before use when expired, and atomically replace rotated material. Concurrent refreshes for one credential SHALL NOT overwrite newer material; failed refresh or logout SHALL NOT resurrect a cleared credential.

#### Scenario: Selected token needs refresh
- **WHEN** a selected credential has expired and refresh succeeds
- **THEN** the model invocation uses the new access token and the encrypted record contains the rotated credential

#### Scenario: Refresh fails or account identity is missing
- **WHEN** refresh is rejected, returns malformed material, or the access token lacks the required account claim
- **THEN** execution fails closed without publishing token contents or selecting another account

### Requirement: Codex Provider execution retains the Pi model boundary

The system SHALL execute a frozen `openai-codex` selection through the native browser-compatible Pi Codex stream, propagate cancellation, and expose only project-owned text deltas or structured failure codes. Authentication, request headers, response bodies, and native exceptions SHALL NOT enter snapshots, logs, transcript payloads, or receipts.

#### Scenario: Selected Codex model streams
- **WHEN** a selected Codex credential is valid and the Provider streams a response
- **THEN** the caller receives ordered text deltas without credential material

#### Scenario: Codex request is denied
- **WHEN** the Provider returns 401 or 403
- **THEN** only a redacted authentication failure is returned and API-key configurations remain executable

