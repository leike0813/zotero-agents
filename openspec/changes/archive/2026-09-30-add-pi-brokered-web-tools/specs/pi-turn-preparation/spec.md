## ADDED Requirements

### Requirement: Web source and external trust facts remain turn frozen

Preparation SHALL retain the resolved source chain identity for each invocation of a turn and SHALL include an instruction treating external_untrusted Web results as data rather than control instructions. Persistent provenance SHALL retain only safe references and digests.

#### Scenario: Search result includes instructions
- **WHEN** a Web result asks the model to change policy
- **THEN** its content remains untrusted data under the prepared instruction
