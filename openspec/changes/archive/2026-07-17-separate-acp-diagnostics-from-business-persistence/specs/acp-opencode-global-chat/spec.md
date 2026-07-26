## MODIFIED Requirements

### Requirement: ACP transcript and business conversation state persist locally

The system SHALL persist local transcript and business conversation state for each OpenCode ACP chat session. Adapter diagnostics, diagnostic-derived stderr tails, and diagnostic-derived lifecycle observations SHALL remain current-process presentation state and SHALL NOT be part of business conversation persistence.

#### Scenario: Persist local sidebar business state
- **WHEN** ACP transcript items, session metadata, permission state, selector state, or user presentation preferences change
- **THEN** the plugin MUST persist the local conversation identity, transcript metadata, recovery-required session state, and current business sidebar state
- **AND** a later plugin startup MUST restore that business state before the next prompt is sent
- **AND** adapter diagnostics MUST NOT trigger a conversation-state write.

#### Scenario: Business save does not carry diagnostic state
- **WHEN** a conversation with current-process diagnostics, stderr tail, or diagnostic-derived lifecycle observation is saved for a business reason
- **THEN** the persisted conversation payload MUST omit those diagnostic fields
- **AND** the in-memory Details and Copy Diagnostics projections MUST remain available for the current process.

#### Scenario: Legacy diagnostic fields are tolerated but not restored
- **WHEN** the plugin reads a legacy conversation payload containing diagnostics, stderr tail, or diagnostic-derived lifecycle observation
- **THEN** it MUST restore all valid business transcript, identity, selector, permission, error, and recovery fields
- **AND** it MUST ignore the legacy diagnostic fields for hydration and recovery decisions
- **AND** a later normal save MUST NOT write those fields back.

#### Scenario: Debug diagnostics are derived audit evidence
- **GIVEN** debug mode is enabled and the conversation has a stable backend and conversation owner
- **WHEN** diagnostics are observed
- **THEN** sanitized diagnostic evidence MAY be appended in bounded batches beneath the conversation storage directory
- **AND** that audit file MUST NOT be referenced by the business conversation payload or read during hydration.

