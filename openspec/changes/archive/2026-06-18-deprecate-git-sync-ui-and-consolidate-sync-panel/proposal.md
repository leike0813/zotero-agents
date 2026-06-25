# Deprecate Git Sync UI and Consolidate Sync Panel

## Why

Git Sync proved too heavy and risky for the current user-facing sync path. It should no longer be presented as a primary configuration or runtime action in Preferences, Dashboard, or Synthesis Home. The implementation remains useful as historical service code and for later cleanup, so this change hides the UI without deleting the core transport.

The Synthesis Home sync experience also needs a clearer layout: status, actions, conflict review, and execution feedback should live in one visual area. WebDAV durable bundle sync is the current visible manual sync transport.

## What Changes

- Hide Git Sync from user-facing Preferences and Synthesis Home.
- Keep Git Sync modules, prefs keys, service facade, and tests, but mark the retained code path as deprecated/hidden.
- Keep WebDAV Sync visible and manual.
- Replace the mixed Git/WebDAV Home sync panel with a WebDAV-focused Sync panel.
- Add a terminal-style feedback area for pending actions, last result, diagnostics, connection status, and last run.

## Non-Goals

- Do not remove Git Sync core modules or stored prefs.
- Do not migrate or delete existing Git Sync runtime/worktree data.
- Do not disable WebDAV Sync.
- Do not synchronize live SQLite.
