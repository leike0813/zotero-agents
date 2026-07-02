## MODIFIED Requirements

### Requirement: Host Bridge diagnostics expose redacted operational state

Host Bridge diagnostics SHALL expose agent-usable operational summaries without leaking credentials, private paths, provider payloads, transcripts, or credential-bearing URLs.

#### Scenario: Diagnostics redact sensitive values

- **WHEN** backend diagnostics include URLs, local paths, or credential-like tokens
- **THEN** the diagnostics response SHALL redact those values before returning them to the client.
