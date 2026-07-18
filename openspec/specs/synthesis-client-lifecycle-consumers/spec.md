## ADDED Requirements

### Requirement: Startup lifecycle uses the grouped client
Plugin startup SHALL reconcile Synthesis runtime work through the system client capability and SHALL keep failures non-blocking.

#### Scenario: Startup reconciliation fails
- **WHEN** default client resolution or runtime reconciliation rejects
- **THEN** plugin startup SHALL continue
- **AND** the existing bounded startup warning path SHALL receive the failure

### Requirement: Protected maintenance reset uses the grouped client
Plugin maintenance handling SHALL invoke protected database reset through the maintenance client capability with the caller-provided confirmation text.

#### Scenario: Confirmation does not match
- **WHEN** the maintenance client receives an invalid confirmation
- **THEN** it SHALL return the structured `confirmation_mismatch` result from the current owner

### Requirement: Host notifications use bounded client receipts
The Zotero item observer SHALL submit related-items echo candidates through the notification client capability and SHALL consume only a bounded boolean receipt.

#### Scenario: Notification is a recorded echo
- **WHEN** the current service classifies a Zotero item notification as a related-items sync echo
- **THEN** the client SHALL return `{ consumed: true }`
- **AND** the observer SHALL exclude that notification from ordinary invalidation counts

#### Scenario: Notification is not an echo
- **WHEN** no matching echo exists
- **THEN** the client SHALL return `{ consumed: false }`
- **AND** ordinary observer processing SHALL continue

### Requirement: Default client invalidation is synchronous and isolated
Preference and Host Bridge mutation paths SHALL invalidate the default client without directly importing the legacy service.

#### Scenario: In-process client has loaded
- **WHEN** default client invalidation runs after the legacy module was composed
- **THEN** both the cached client and legacy default service SHALL be invalidated synchronously

#### Scenario: In-process client has not loaded
- **WHEN** invalidation runs before first client resolution
- **THEN** it SHALL complete without loading the legacy service

### Requirement: Direct legacy consumers decrease
Hooks, Host Bridge server lifecycle handling, and item observation SHALL NOT import or type against the full legacy Synthesis service.

#### Scenario: Boundary inventory is checked
- **WHEN** the service boundary checker scans production sources
- **THEN** those three modules SHALL be absent from the direct-consumer set
