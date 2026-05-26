## Overview

The change keeps the existing preferences panel surface but changes its data
source. The panel will request a governance snapshot that includes both the
current runtime usage snapshot and the persistence integrity report. Cleanup
will target integrity issue ids instead of broad runtime categories.

## Decisions

- Reuse the existing `runtime-data-*` DOM ids to avoid unnecessary XHTML churn
  and keep existing preferences layout tests focused.
- Keep `scanRuntimePersistenceUsage()` and
  `cleanupRuntimePersistenceCategory()` available for low-level and legacy
  tests, but route the preferences panel through the governance events.
- Use `cleanupPersistenceIssues({ dryRun: true })` for preview and
  `cleanupPersistenceIssues({ dryRun: false, issueIds })` only after user
  confirmation.
- Do not offer cleanup actions for non-cleanable issues, durable Synthesis
  paths, or the SQLite state database.

## Data Flow

1. Preferences panel sends `scanPersistenceGovernance`.
2. Hooks return `{ usage, integrity }` from `scanRuntimePersistenceUsage()` and
   `scanPersistenceIntegrity()`.
3. The panel renders the managed root, runtime usage rows, and integrity issue
   rows.
4. For a cleanable issue, the panel first requests
   `cleanupPersistenceGovernanceIssues` with `dryRun: true` and the issue id.
5. After confirmation, it requests the same event with `dryRun: false`, then
   renders the returned refreshed governance snapshot.

## Failure Handling

- Scan and cleanup failures are shown in the existing panel summary error
  location.
- A dry-run result that skips the selected issue leaves the real cleanup button
  disabled by omission: the panel only renders cleanup actions when
  `eligibleForCleanup` is true.
- Cleanup results are bounded to issue ids returned by the integrity scanner.

## Out of Scope

- Automatic migration from legacy roots.
- Deleting old `zotero-skills` data.
- Cleaning Synthesis canonical data.
- Complex batch cleanup UI.
