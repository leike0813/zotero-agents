## 1. Recorder Contract and State Machine TDD

- [x] 1.1 Add failing recorder/validator tests for ignored pre-claim events, first-success/stale claims, session mismatch, paired roots, required complete activity, and deferred finish.
- [x] 1.2 Implement explicit round/claim tokens, structured binding, activity registry, `stopping`, deferred root finish, cancel/reset invalidation, and complete-trace validation.
- [x] 1.3 Update replay fixtures and persistence assertions so only traces with one root pair and a complete activity are accepted.

## 2. ACP Chat Lifecycle TDD

- [x] 2.1 Add lifecycle tests for eligible explicit connect/reconnect claims, ineligible existing or implicit sessions, pre-claim isolation, multi-turn capture, replacement notice, and forced turn closure.
- [x] 2.2 Wire claim attempts and session-aware debug context through connection/session paths; remove prompt-time root guessing and reject new turns while stopping.
- [x] 2.3 Expose Dashboard-only Chat binding, activity, finish availability, and replacement notice without changing Workspace signatures.

## 3. ACP Skills Workflow Lifecycle TDD

- [x] 3.1 Add seam/orchestration tests for canonical execution roots across ordinary, multi-job, concurrent, and sequence paths, including failure/cancel, recovery, and zero-ACP execution.
- [x] 3.2 Propagate transient top-level workflow claim context through ordinary and sequence ACP requests without changing public or persistent run identity.
- [x] 3.3 Wrap execution idle completion to aggregate outcome, close the unique root after all request terminals, and freeze before apply.

## 4. Dashboard, Documentation, and Isolation

- [x] 4.1 Update recorder Dashboard actions/rendering and localized labels for armed, connecting, bound, stopping, notices, cancel, finish, and save.
- [x] 4.2 Update recorder/performance and testing documentation for explicit Chat claim, Workflow auto-finish, capture completeness, and manual host acceptance.
- [x] 4.3 Verify recorder state remains absent from Assistant Workspace snapshots and transcript/chrome region signatures.

## 5. Validation

- [x] 5.1 Run focused semantic trace, Chat lifecycle, workflow seam, UI smoke, and replay tests.
- [x] 5.2 Run TypeScript, ESLint/Prettier, localization governance, runtime diagnostics release-elision, strict OpenSpec validation, and `git diff --check`.
- [x] 5.3 Record Zotero 7/9 multi-turn Chat, disconnect/recovery/replacement, multi-stage Workflow, save, and backend-free replay as pending manual host acceptance unless executed in both hosts.
