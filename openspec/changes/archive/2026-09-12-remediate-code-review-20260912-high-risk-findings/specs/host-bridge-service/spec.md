## ADDED Requirements

### Requirement: Host Access authentication SHALL precede request-body consumption

Except for `GET /bridge/v2/health`, the unified listener SHALL validate the shared bearer token from the bounded request head before accepting request-body bytes. Rejected authentication MUST NOT invoke route handlers or perform repeated master-token key derivation for an unchanged encrypted token and key material.

#### Scenario: Repeated invalid bearer requests use an unchanged master token

- **WHEN** callers repeatedly present invalid bearer values while the encrypted master-token envelope and key material remain unchanged
- **THEN** every request SHALL be rejected
- **AND** the stored master token SHALL be decrypted through one shared in-flight or cached derivation.

#### Scenario: Master token rotates

- **WHEN** the encrypted master-token envelope or key material changes
- **THEN** subsequent authentication SHALL derive the new token
- **AND** the previous bearer value SHALL no longer authorize requests.

### Requirement: MCP SHALL preserve canonical Broker failures

MCP tool failures originating from the Zotero Host Capability Broker SHALL preserve the Broker's stable code, retryability, and strict-JSON details. Established not-found aliases and invalid-cursor mappings SHALL remain unchanged.

#### Scenario: Broker rejects a capability with structured details

- **WHEN** a Broker capability throws a structured capability error other than an established alias case
- **THEN** MCP SHALL return a tool error carrying the same stable code, retryable value, and details
- **AND** it SHALL not collapse the error into generic invalid parameters.
