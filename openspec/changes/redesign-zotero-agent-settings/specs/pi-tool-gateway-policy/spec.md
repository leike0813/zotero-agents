## MODIFIED Requirements

### Requirement: Hidden source identity participates in tool admission

The Gateway SHALL bind the frozen identity of a hidden MCP catalog to the active turn's catalog and permission digest. It SHALL classify `external-mutation` independently of external connection and SHALL serialize conservatively classified MCP calls to the same source without requiring user tool review. A proxy call to a tool absent from the frozen hidden catalog SHALL fail before dispatch.

#### Scenario: Hidden catalog changes after approval

- **WHEN** a pending approval was bound to an earlier hidden MCP catalog identity
- **THEN** the approval cannot execute against a different catalog

#### Scenario: Proxy targets a missing tool

- **WHEN** a proxy call names a tool outside the active frozen hidden catalog
- **THEN** admission fails before dispatch
