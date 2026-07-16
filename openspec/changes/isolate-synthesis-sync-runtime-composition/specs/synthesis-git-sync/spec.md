## MODIFIED Requirements

### Requirement: Git Sync can use a prefs-configured Git command adapter

Git Sync SHALL provide a production runtime binding that is enabled only by explicit prefs configuration. Git Sync SHALL store its enabled flag, remote URL, branch, and auto-retry flag in Zotero preferences. Git Sync SHALL detect the Git executable automatically and SHALL NOT require users to configure a Git command path. The production composition SHALL construct and inject this binding; the application service SHALL NOT read those preferences or construct the adapter.

#### Scenario: Git Sync prefs are incomplete

- **WHEN** Git Sync is disabled or remote URL is empty
- **THEN** the production Git Sync runtime binding SHALL remain disabled
- **AND** no git command SHALL be executed
- **AND** Workbench SHALL offer preferences as the configuration path.

#### Scenario: Git Sync prefs are complete

- **WHEN** Git Sync is enabled and remote configuration is valid
- **THEN** the default legacy composition SHALL inject a Git command adapter
- **AND** the adapter SHALL use plugin-safe subprocess APIs, not Node-only child process imports.

### Requirement: WebDAV sync uses durable bundle snapshots

Synthesis SHALL provide an experimental WebDAV Sync transport that exchanges durable bundle snapshots and SHALL NOT synchronize the live SQLite database. WebDAV remote access SHALL use an injected Host port whose production adapter owns current preferences, credentials, URL construction, and HTTP execution.

#### Scenario: WebDAV remote is empty

- **WHEN** the injected Host port reports the remote `HEAD.json` as missing
- **THEN** WebDAV Sync SHALL upload a new immutable snapshot and publish HEAD last.

#### Scenario: WebDAV remote changes during upload

- **WHEN** the Host port reports an ETag/precondition conflict while publishing HEAD
- **THEN** WebDAV Sync SHALL stop without overwriting remote HEAD
- **AND** SHALL surface a stable conflict diagnostic.

#### Scenario: WebDAV bundle is invalid

- **WHEN** a downloaded durable bundle fails validation
- **THEN** WebDAV Sync SHALL reject the import
- **AND** SHALL leave the local canonical state unchanged.
