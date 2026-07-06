## 1. OpenSpec

- [x] 1.1 Add proposal, design, and delta specs for hardened artifact readiness.
- [x] 1.2 Validate the change in strict mode.

## 2. Shared Readiness

- [x] 2.1 Add marker-first generated note classification with schema/heading-gated embedded payload fallback.
- [x] 2.2 Keep heading-only generated notes from being classified as artifacts.

## 3. Artifact Row Refresh

- [x] 3.1 Register and unregister a Zotero item Notifier observer through plugin lifecycle.
- [x] 3.2 Ensure item, note, and attachment notifications invalidate affected parent rows without refreshing item tree columns.

## 4. Tests And Validation

- [x] 4.1 Cover marker fast path, embedded payload fallback, and heading-only negative readiness cases.
- [x] 4.2 Cover parent row refresh for child note and attachment notifications.
- [x] 4.3 Run focused tests, formatting checks, typecheck, and lint for affected files.
