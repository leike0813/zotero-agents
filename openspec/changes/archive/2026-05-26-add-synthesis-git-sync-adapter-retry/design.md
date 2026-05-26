## Design

The adapter remains injectable. The default service only constructs the production adapter when prefs explicitly enable Git Sync and provide a remote URL. No real git command is run unless those prefs are set.

The Git command adapter uses Zotero/Mozilla subprocess APIs through a small command-runner boundary. Tests inject a fake runner. Plugin runtime code does not import Node `child_process`.

## Token Storage

Git remote token storage is prefs-only but not plaintext. A token helper writes an AES-GCM encrypted envelope to prefs, plus masked token metadata. Reads either return the decrypted token or a config diagnostic; failures do not fall back to plaintext.

The token is only used transiently to build the command remote input. State, receipts, diagnostics, and UI snapshots keep sanitized remote URLs.

## Retry Backoff

Retry metadata lives in Git Sync state and run receipts:

- `retry_attempt`
- `next_retry_at`
- `last_retry_at`

Retryable failures schedule a timer when auto retry is enabled. The sequence is 1m, 5m, 15m, then 30m. Tests can inject shorter delays. Paused or conflict-blocked state prevents automatic retry. Manual retry clears the schedule and runs immediately.

## Out of Scope

- Workbench credential or remote configuration UI
- Multiple remotes or branches
- Semantic merge
- Hosted sync service
- SQLite/FTS sync backend
- Main specs archive/sync
