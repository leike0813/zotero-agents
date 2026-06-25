# synthesis-git-sync Delta

## ADDED Requirements

### Requirement: Git Sync is a deprecated hidden transport

Git Sync implementation code MAY remain available for historical diagnostics and future cleanup, but it SHALL NOT be exposed as a user-facing sync configuration or Home action.

#### Scenario: Preferences render

- **WHEN** Zotero Preferences render
- **THEN** they SHALL NOT show Git Sync configuration, token storage, connection test, or runtime controls.

#### Scenario: Retained code is inspected

- **WHEN** retained Git Sync service, prefs, token, or adapter entrypoints are read
- **THEN** they SHALL carry a clear deprecation note that the transport is hidden from user-facing sync UI.
