## ADDED Requirements

### Requirement: ChatGPT lifecycle evidence remains bounded structural facts

Authentication, registration pause/resume and actual invocation evidence SHALL use the existing audit allowlist and fact owner. Canonical failures SHALL remain referenced once by identity; authorization URLs, callback codes, ID tokens, JWKS payloads and native response content SHALL be excluded. User-requested recovery trials SHALL not introduce periodic health probes.

#### Scenario: Authentication fails privately

- **WHEN** a login or refresh fails with native response detail
- **THEN** audit records only allowed structural status and correlation without that detail
