# Design: Git Sync Config and Conflict Review

## Preferences

Git Sync configuration is stored in Zotero prefs:

- `synthesisGitSyncEnabled`
- `synthesisGitSyncRemoteUrl`
- `synthesisGitSyncBranch`
- `synthesisGitSyncAutoRetryEnabled`
- encrypted token prefs already owned by `gitSyncTokenPrefs.ts`

The preferences card never renders token plaintext. Saving a non-empty token calls the encrypted token helper; clearing the token clears encrypted/masked/updated prefs.

Git executable selection is not a user preference. The plugin detects it at runtime using trusted Mozilla path search when available, the shared Windows command-resolution helpers, and known Git installation paths. Any legacy `synthesisGitSyncGitCommand` pref is ignored.

## Connection Test

`testGitSyncConfiguration()` validates prefs, decrypts the token if present, resolves the Git executable, runs `git --version`, then runs `git ls-remote --heads <remote> <branch>`. It does not initialize, write, fetch into, or commit a worktree.

The connection test separates remote reachability from branch existence. A successful `ls-remote` with the target head present reports `remote_branch_state: "exists"`. A successful `ls-remote` with empty output reports `remote_branch_state: "missing_initializable"`, keeps `ok: true`, and emits the info diagnostic `git_sync_remote_branch_missing_initializable`. Only a non-zero `ls-remote` result is a connection failure.

Diagnostics are sanitized with the existing Git Sync URL/token sanitizer and include bounded executable-resolution details such as `checkedPaths` when Git cannot be found.

## Empty Remote Initialization

An empty remote repository or missing configured branch is a normal first-sync state. During sync, `fetch origin <branch>` results that explicitly say Git could not find the remote ref are treated as initializable. The adapter records `git_sync_remote_branch_missing_initializable`, skips `merge origin/<branch>`, and continues through export, commit, and `push origin HEAD:<branch>`. Authentication, permission, DNS, TLS, and other non-missing-ref failures remain retryable/permanent failures and do not enter the initialization path.

## Workbench Status

Workbench receives a read-only projection of config status, token mask, token updated time, latest connection test result, and remote branch state. Workbench can open preferences and run sync actions, but it does not edit long-term Git Sync config. When the remote branch is `missing_initializable`, Workbench shows a `will initialize` branch summary and keeps `Sync now` available.

## Conflict Approval

The Git Sync conflict API accepts:

- `keep_local`
- `use_remote`
- `save_remote_copy`
- `mark_needs_attention`
- `clear_after_manual_edit`

v1 enables conservative actions by default. Unsafe `use_remote` and unresolved `mark_needs_attention` return diagnostics and keep the conflict blocked unless the service can prove the action is safe.
