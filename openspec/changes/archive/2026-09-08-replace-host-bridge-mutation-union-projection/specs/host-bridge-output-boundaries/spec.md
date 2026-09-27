## ADDED Requirements

### Requirement: Typed mutation evidence has an operation-specific boundary
Bridge, MCP, and CLI projections SHALL expose operation-specific preview or execution results with the existing path-free attachment projection. They SHALL not expose the generic mutation union or generic HTTP operation envelope.

#### Scenario: Typed mutation returns attachment facts
- **WHEN** a typed attachment mutation returns attachment facts
- **THEN** every attachment summary uses the existing remote-safe descriptor projection and omits host-local paths.
