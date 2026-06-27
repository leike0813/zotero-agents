## MODIFIED Requirements

### Requirement: Log Viewer Window SHALL Default to Hiding Debug and Provide Level Filters

The log viewer SHALL show non-debug levels in its visible filter state by default and SHALL allow users to filter by level.

#### Scenario: Initial open state

- **WHEN** the log window opens
- **THEN** visible filters SHALL include `info`, `warn`, and `error` selected by default
- **AND** `debug` SHALL NOT be selected by default.

#### Scenario: Filter to errors only

- **WHEN** user applies level filter to `error` only
- **THEN** the log list SHALL only display entries whose level is `error`.

### Requirement: Log Viewer Window SHALL Support Copy/Export for Issue Feedback and Developer Debugging

The log viewer MUST provide user actions to copy issue diagnostics and developer debugging logs without mixing the two outputs.

#### Scenario: Copy visible logs

- **WHEN** user triggers copy action for visible logs
- **THEN** the output SHALL be generated from currently filtered entries
- **AND** the default copy format SHALL be Pretty JSON Array.

#### Scenario: Copy diagnostic bundle JSON

- **WHEN** user triggers `Copy Diagnostic Bundle`
- **THEN** the output SHALL conform to `RuntimeIssueDiagnosticBundleV1`
- **AND** it SHALL NOT include full raw retained log entries by default.
