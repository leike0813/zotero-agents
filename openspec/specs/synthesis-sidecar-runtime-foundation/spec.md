## ADDED Requirements

### Requirement: Citation Graph application follows repository recovery
The service SHALL construct the private Citation Graph application only after isolated repository identity/schema validation and operation reconciliation, and SHALL keep it absent from authenticated capability routing.

#### Scenario: Ready service has recovered graph state
- **WHEN** a valid persisted shadow graph exists at startup
- **THEN** direct private composition can inspect it after recovery while health, handshake, and discovery remain unchanged
