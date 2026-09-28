# Spec Delta

## ADDED Requirements

### Requirement: Hidden source identity participates in tool admission

The Gateway SHALL bind the frozen identity of a hidden MCP catalog to the active turn's catalog and permission digest. It SHALL classify `external-mutation` independently of external connection and SHALL serialize unreviewed calls to the same source. A proxy call to a tool absent from the frozen hidden catalog SHALL fail before dispatch.

#### Scenario: Hidden catalog changes after approval
- **WHEN** a pending approval was bound to an earlier hidden MCP catalog identity
- **THEN** the approval cannot execute against a different catalog

