## ADDED Requirements

### Requirement: MCP library cursors are opaque strings

The Zotero MCP tool schemas SHALL accept library cursors only as strings and SHALL preserve the shared library cursor error contract.

#### Scenario: MCP schema describes a library cursor

- **WHEN** MCP lists a paginated library tool
- **THEN** its cursor input SHALL be typed as a string
- **AND** clients SHALL be able to pass through a returned `nextCursor` unchanged.

#### Scenario: MCP receives an invalid library cursor

- **WHEN** a paginated library tool receives a malformed, unsupported, criteria-mismatched, or non-zero numeric cursor
- **THEN** MCP SHALL expose code `invalid_library_cursor`
- **AND** the error SHALL not advise an unchanged retry.
