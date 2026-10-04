## MODIFIED Requirements

### Requirement: Profile credentials fail closed

The system SHALL retain multiple labeled API-key or verified ChatGPT credential records in versioned encrypted envelopes, expose only redacted metadata to UI, and resolve plaintext only for an active caller. Missing, corrupt, or cryptographically inaccessible credentials SHALL fail closed. Deleting a configuration SHALL NOT implicitly delete its credential, and deleting a credential SHALL NOT silently select another.

#### Scenario: Encrypted record cannot be decrypted

- **WHEN** a selected credential envelope is damaged or its profile key is missing
- **THEN** credential resolution fails without publishing plaintext or falling back to another credential

## REMOVED Requirements

### Requirement: Codex model availability uses official credential-bound discovery

**Reason**: The development Codex capability is replaced by official Sign in with ChatGPT.
**Migration**: Remove obsolete Codex configuration, credentials and discovery/default references; retain all historical owner and effect evidence without automatic rebind.

## ADDED Requirements

### Requirement: ChatGPT visibility and applicable facts are registration bound

The system SHALL discover the selected ChatGPT registration through the official models API after login, explicit refresh or user account switch. It SHALL preserve listed order/display names/slugs, isolate cached identity and reject stale commits. Visible models SHALL require reliable SIWC-applicable context for execution; missing output/capabilities/pricing remain unknown without same-name public API inheritance.

#### Scenario: User switches registration

- **WHEN** a user selects another saved registration
- **THEN** its own cache projects first and only its discovery refreshes

#### Scenario: Unknown limits

- **WHEN** a listed model has no reliable SIWC context limit
- **THEN** it is visible but cannot invoke

#### Scenario: Valid empty discovery

- **WHEN** a valid selected-account response has no listed models
- **THEN** its visibility becomes empty without another account's recommendations
