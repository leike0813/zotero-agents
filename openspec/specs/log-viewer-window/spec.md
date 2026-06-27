# log-viewer-window Specification

## Purpose
TBD - created by archiving change add-plugin-log-system. Update Purpose after archive.
## Requirements
### Requirement: Log Viewer Window SHALL Be Openable from Plugin Workflow Menu
The plugin SHALL provide a dedicated log window entry from workflow-related menu actions.

#### Scenario: Open log window from menu
- **WHEN** user clicks the log menu entry in plugin workflow menu
- **THEN** the plugin SHALL open an independent log window

### Requirement: Log Viewer Window SHALL Default to Hiding Debug and Provide Level Filters
The log viewer SHALL show non-debug levels in its visible filter state by default and SHALL allow users to filter by level.

#### Scenario: Initial open state
- **WHEN** the log window opens
- **THEN** visible filters SHALL include `info`, `warn`, and `error` selected by default
- **AND** `debug` SHALL NOT be selected by default.

#### Scenario: Filter to errors only
- **WHEN** user applies level filter to `error` only
- **THEN** the log list SHALL only display entries whose level is `error`

### Requirement: Log Viewer Window SHALL Support Multi-select Backend and Workflow Filtering
The log viewer SHALL allow users to select multiple backends and workflows simultaneously using checkbox-based filters.

#### Scenario: Multi-select filtering
- **WHEN** user selects multiple backends via checkboxes
- **THEN** the log list SHALL display entries matching any of the selected backends
- **AND** the trigger labels SHALL reflect selection count or "All" if no filter is applied

### Requirement: Log Viewer UI Interaction SHALL Be Stable During Background Updates
Interactive components like filter dropdowns SHALL NOT be closed or reset when the log list or dashboard state refreshes in the background.

#### Scenario: Background refresh stability
- **WHEN** a background log update occurs while a filter dropdown is open
- **THEN** the dropdown SHALL remain open and maintain its current selection state

### Requirement: Log Viewer Window SHALL Support Copy/Export for Issue Feedback and Developer Debugging
The log viewer MUST provide user actions to copy issue diagnostics and developer debugging logs without mixing the two outputs.

#### Scenario: Copy visible logs
- **WHEN** user triggers copy action for visible logs
- **THEN** the output SHALL be generated from currently filtered entries
- **AND** the default copy format SHALL be Pretty JSON Array

#### Scenario: Copy all logs
- **WHEN** user triggers copy all action
- **THEN** the output SHALL include all retained entries in Pretty JSON Array format

#### Scenario: Copy diagnostic bundle JSON
- **WHEN** user triggers `Copy Diagnostic Bundle`
- **THEN** the output SHALL conform to `RuntimeIssueDiagnosticBundleV1`
- **AND** it SHALL NOT include full raw retained log entries by default.

#### Scenario: Copy issue summary markdown
- **WHEN** user triggers `Copy Issue Summary`
- **THEN** the output SHALL include environment summary, repro window, top errors, and correlated request/job identifiers

#### Scenario: Copy success feedback
- **WHEN** any copy action is successfully completed
- **THEN** the viewer SHALL display a non-obstructive success notification (toast)

### Requirement: Log Viewer Window SHALL Include Internationalized Labels
The log window MUST use locale strings for labels, actions, and status messages, including newly added diagnostic controls.

#### Scenario: Locale-specific action labels
- **WHEN** plugin language is switched between supported locales
- **THEN** log window action labels SHALL display translated text instead of hardcoded English strings

### Requirement: Log Viewer Window SHALL Expose Diagnostic Mode Toggle
The log viewer MUST expose a session-level diagnostic mode toggle and reflect its current state.

#### Scenario: Enable diagnostic mode from viewer
- **WHEN** user turns on diagnostic mode in log viewer
- **THEN** runtime log pipeline SHALL switch to diagnostic collection mode for current session
- **AND** viewer SHALL show an active diagnostic-state indicator

### Requirement: Log Viewer Window SHALL Show Budget and Sanitization Status
The log viewer MUST surface retention budget and sanitization metadata to explain dropped data and redaction behavior.

#### Scenario: Budget limit reached
- **WHEN** retention budget evicts entries or payload bytes
- **THEN** viewer SHALL display eviction notice with reason (`entry_limit` or `byte_budget`)

#### Scenario: Sanitization policy reminder
- **WHEN** logs are displayed or exported
- **THEN** viewer SHALL show that sensitive values are redacted and large payloads are summarized

### Requirement: Log viewer entry MUST be exposed from preferences workflow section
系统 MUST 在首选项工作流区提供日志窗口入口。

#### Scenario: Open log viewer from preferences
- **WHEN** 用户在首选项工作流区点击 `Open Log Viewer`
- **THEN** 系统 MUST 打开日志窗口页面（Dashboard runtime-logs tab）

### Requirement: Workflow context menu MUST NOT expose log viewer entry
系统 MUST 不再从 workflow 右键菜单提供日志窗口入口。

#### Scenario: Open workflow context menu
- **WHEN** 用户打开 workflow 右键菜单
- **THEN** 菜单 MUST NOT 出现 `Open Logs...` 项

