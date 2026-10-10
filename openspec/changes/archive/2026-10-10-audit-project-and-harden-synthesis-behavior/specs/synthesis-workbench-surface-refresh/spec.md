## ADDED Requirements

### Requirement: Surface response admission SHALL preserve the current library owner

The Workbench controller SHALL reject a surface response for a different library before changing accepted request IDs, cached surface state or visible content.

#### Scenario: An old library response arrives with a newer request ID

- **WHEN** the selected library changes and a response for the previous library arrives
- **THEN** current library rows and loaded state remain unchanged
- **AND** a subsequent valid response for the current library is not rejected because of the old library response's request ID
- **AND** the same isolation applies to hidden surfaces
