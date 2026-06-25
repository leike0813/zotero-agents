# Add Git Sync Config and Conflict Review

## Why

Git Sync durable-state exchange is now the Synthesis cross-device sync boundary, but the feature still needs a product-grade configuration and conflict approval surface. Configuration must live in Zotero preferences, and Git credentials must never be stored in plaintext.

## What Changes

- Add a Git Sync card to Zotero preferences.
- Store Git Sync remote, branch, enabled state, and retry policy in prefs.
- Detect the Git executable automatically instead of asking users to configure a command.
- Store access tokens through the existing encrypted token preference envelope.
- Add a non-mutating connection test path for Git executable detection and remote reachability checks.
- Treat empty remotes and missing configured branches as first-sync initialization states rather than connection failures.
- Extend Workbench Git Sync status with configuration and token metadata.
- Replace coarse conflict actions with semantic approval actions.

## Non-Goals

- Do not introduce OS keychain storage.
- Do not move long-term Git Sync configuration into Workbench.
- Do not implement v1 field-level merge or last-writer-wins.
- Do not make connection testing mutate the Git worktree.
