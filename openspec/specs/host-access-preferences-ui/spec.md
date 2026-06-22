### Requirement: Host Access preferences separate status and operation feedback

The preferences Host Access card SHALL show service status summaries separately
from dynamic operation feedback.

#### Scenario: Service status remains diagnostic

- **WHEN** Host Bridge or MCP service status is rendered
- **THEN** the status text SHALL include service state, bind/port information,
  endpoint, and service errors only
- **AND** it SHALL NOT include operation success messages, token values, masked
  tokens, bearer headers, or local filesystem paths.

#### Scenario: Operations render into a notice area

- **WHEN** the user installs the CLI, displays endpoint information, changes
  Host Access settings, rotates tokens, or copies a profile/token
- **THEN** the operation result message SHALL render in a dedicated Host Access
  operation notice area
- **AND** the Host Bridge service status text SHALL remain a service summary.

#### Scenario: Operation failures are not service errors

- **WHEN** a Host Access operation returns a failed result that is not a listener
  failure
- **THEN** the notice area SHALL show the failure message with failure styling
- **AND** the status summary SHALL NOT label that operation message as a service
  error.
