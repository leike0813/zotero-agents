## ADDED Requirements

### Requirement: Official grounded search reuses selected Codex authentication

Eligible OpenAI grounded search SHALL obtain short-lived authentication from the selected Codex credential through the existing refresh boundary. Search SHALL NOT own OAuth lifecycle or disclose access, refresh, headers or native responses.

#### Scenario: Grounded search uses Codex
- **WHEN** the selected eligible source uses a connected Codex configuration
- **THEN** only that credential is resolved and specialized forced-search output is normalized
