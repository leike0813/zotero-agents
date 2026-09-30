## ADDED Requirements

### Requirement: Optional Conversation auxiliary model selection

Provider configuration SHALL support one optional auxiliary model selection referencing an existing runnable configuration. It SHALL be used only for Pi Conversation title generation, carry no separate credentials, and be invalidated when its referenced configuration becomes unavailable. Absence SHALL use deterministic titles without an auxiliary Provider call.

#### Scenario: Auxiliary configuration is removed

- **WHEN** its referenced Provider configuration is deleted or made unavailable
- **THEN** new title tasks use deterministic fallback and existing main Conversation model selection remains independent.
