## MODIFIED Requirements

### Requirement: Observation contracts SHALL be strict and payload-free

The v2 rebuilder SHALL reject unknown fields, free error text, raw locators,
paths, credentials, and identifiers outside closed identity/fact/metric keys.
Zero-valued allowlisted metrics and facts SHALL be preserved.

#### Scenario: Unknown detail is supplied
- **WHEN** an event contains a title or arbitrary detail key
- **THEN** rebuilding fails closed
