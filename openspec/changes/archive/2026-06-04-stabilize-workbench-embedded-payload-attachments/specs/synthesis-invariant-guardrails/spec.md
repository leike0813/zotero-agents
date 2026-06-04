## ADDED Requirements

### Requirement: Synthesis invariant guards SHALL prevent legacy artifact fallback
Guardrails SHALL prevent reintroducing note-only or hidden-HTML artifact availability fallback in active Synthesis paths.

#### Scenario: Hidden payload fallback appears in Synthesis artifact availability
- **WHEN** active Synthesis artifact scan code treats hidden HTML payload blocks or note existence as available artifacts
- **THEN** invariant tests SHALL fail.
