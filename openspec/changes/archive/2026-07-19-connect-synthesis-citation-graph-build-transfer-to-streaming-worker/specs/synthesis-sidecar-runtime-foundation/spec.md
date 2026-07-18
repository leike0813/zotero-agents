## ADDED Requirements

### Requirement: Transfer execution preserves authenticated responsive control
The sidecar SHALL authenticate and strictly rebuild `execute`, keep health/handshake/status O(1), and keep control requests responsive while a streaming task is queued, active, or publishing.

#### Scenario: Worker is processing normal input
- **WHEN** health, handshake, or transfer status is requested
- **THEN** the service SHALL answer without scanning staged pages or waiting for worker completion
