# pi-chatgpt-auth Specification

## Purpose

Provide verified, profile-owned ChatGPT registrations and renewable authentication for explicitly authorized built-in Pi work without disclosing credentials or weakening owner recovery.

## Requirements

### Requirement: Registrations retain verified identity and stable host ownership

The system SHALL persist one opaque host ID per profile before authorization, retain distinct registrations by verified issuer/subject and issued client ID, and bind configurations explicitly. Email SHALL NOT merge registrations. Returning authorization SHALL retain the host/client mapping and reject a changed identity before credential replacement.

#### Scenario: Returning account differs

- **WHEN** a returning authorization verifies a different subject or client
- **THEN** the old valid credential remains and the attempt fails safely

#### Scenario: Several registrations share email

- **WHEN** two validated registrations have the same email
- **THEN** their labels, credentials, selection and client IDs remain independent

### Requirement: Browser authorization is attempt bound

User-initiated authorization SHALL own one bounded active attempt with fresh state, nonce and S256 PKCE. The listener SHALL bind HTTP 127.0.0.1 /auth/callback before the browser opens, and retain the exact URI through exchange. Duplicate, canceled, expired or stale callbacks SHALL NOT exchange twice or publish credentials.

#### Scenario: Repeated connect

- **WHEN** the same login is already active
- **THEN** the original request remains active without another browser authorization

#### Scenario: Callback fails state

- **WHEN** a callback has wrong or duplicated state or an OAuth error
- **THEN** no code is exchanged and no secret or callback URL enters UI/diagnostics

### Requirement: ID validation and granted plan permission are distinct

The system SHALL verify RS256 ID tokens against fixed OpenAI JWKS, including issuer, issued-client audience, expiry, nonce and subject. Key refresh SHALL be bounded. Only token-response granted scopes SHALL enable plan usage; a verified login missing direct-plan permission SHALL remain signed in with inference disabled.

#### Scenario: Missing plan scope

- **WHEN** a verified token response omits chatgpt.tokens.use.direct
- **THEN** the registration remains saved and offers explicit reauthorization without inference

#### Scenario: Unverified token

- **WHEN** signature, audience, expiry or nonce is invalid
- **THEN** credentials are not replaced and only a safe failure is returned

### Requirement: Renewal serializes rotation and preserves registration identity

Renewal SHALL be on demand and single-flight per registration, atomically saving the latest rotating material with revision/generation checks. A canceled waiter SHALL NOT discard an already-started renewal. Invalid or unconfirmed rotation SHALL require safe recovery rather than blind replay; deletion, replacement and shutdown SHALL prevent late restoration.

#### Scenario: Waiter cancels during refresh

- **WHEN** one caller cancels after a shared refresh starts
- **THEN** its wait ends while the owner settles and stores the rotation for remaining callers

#### Scenario: Credential removed during refresh

- **WHEN** the credential is removed before the response commits
- **THEN** the response cannot recreate it

### Requirement: Sign out settles renewable credentials locally

Sign out SHALL stop new work, coordinate pending renewal, attempt bounded official refresh-token revocation and clear local access/refresh/ID tokens. Empty HTTP 200 SHALL confirm revocation. Unconfirmed remote revocation SHALL remain explicit. Sign out SHALL retain registration/host mapping; remove SHALL delete the local registration without claiming remote client deletion.

#### Scenario: Revocation unavailable

- **WHEN** remote revocation cannot be confirmed within the bound
- **THEN** local tokens are cleared and the safe result identifies unconfirmed remote revocation

### Requirement: Quota admission is registration scoped and explicitly recoverable

Confirmed plan quota failure SHALL durably pause all new inference for the affected registration, including auxiliary and search work. Existing requests SHALL settle normally and other registrations remain independent. One user-initiated trial SHALL be admitted at a time; actual success SHALL reopen admission without automatically continuing paused owners.

#### Scenario: Restart after quota failure

- **WHEN** a paused registration is reloaded
- **THEN** new inference remains blocked without a timer probe

#### Scenario: Concurrent recovery requests

- **WHEN** two user recovery actions target the paused registration
- **THEN** only one trial request is sent and failure leaves it paused

### Requirement: Development cleanup is narrow and idempotent

Initialization SHALL remove only old Codex configurations, credentials, account discovery and default references through an idempotent persisted cleanup. It SHALL preserve API keys, other providers, canonical histories, workspaces, receipts, terminal outcomes and unresolved effects, and SHALL NOT rebind an old owner to ChatGPT.

#### Scenario: Cleanup runs twice

- **WHEN** a profile contains old Codex facts and unrelated data
- **THEN** both initializations retain unrelated data and no historical work is replayed
