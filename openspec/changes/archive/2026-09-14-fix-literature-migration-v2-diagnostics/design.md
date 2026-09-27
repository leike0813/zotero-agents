## Context

See `proposal.md`. The parent-set writer deliberately retains exact v1 attachments until canonical verification, but the current boolean also retains superseded v2 attachments. Zotero may unload both erased and newly created attachment item objects when a native transaction commits; reading either object afterward while constructing receipt evidence can turn a successful write into a generic commit failure. Citation enrichment also discovers References by inspecting every managed child note, so a historical Score payload rejected by the post-canonicalization parser can fail an otherwise successful References/Citation verification. Dashboard run history renders run-level strings even though the durable mutation authority retains richer safe evidence per set operation.

## Goals / Non-Goals

**Goals:**

- Preserve one-transaction parent-set semantics and strict managed-note ambiguity checks.
- Restore read compatibility for the exact Literature Score envelope emitted by the historical workflow without widening the external canonical contract.
- Prevent unrelated managed-note damage from controlling target-kind singleton discovery or migration verification.
- Make the existing durable failure evidence immediately useful on the migration page, including for historical runs.
- Keep Dashboard reads bounded and diagnostics free of native refs, paths, titles, and payloads.

**Non-Goals:**

- No migration definition-version bump, persistence schema migration, generic runtime-log redesign, or automatic retry.
- No write validation against the user's original Zotero library.

## Decisions

1. The deferred-cleanup flag applies only to an exact attachment-backed v1 primary payload. A replaced v2 payload follows the normal transactional removal path. This keeps compensation-safe v1 behavior without weakening global ambiguity detection.
2. Prepared attachment keys are assigned to Zotero's pre-save `_key` storage slot. The public `key` property is getter-only in the supported Zotero runtimes, while `save()` consumes `_key` when present.
3. The state store exposes one `LIMIT 1` primary issue query, prioritized as failed, repair-required, changed, then blocked. This avoids rebuilding the full diagnostic bundle on every Dashboard snapshot.
4. The migration service owns one safe authority projector reused by the primary diagnostic and exported bundle. Dashboard receives a strict flat DTO and adds only localized presentation and recovery guidance.
5. The existing diagnostic export remains the detailed support artifact. Its clipboard action reuses `copyText()` so missing clipboard support becomes an explicit error.
6. Payload replacement captures the removed attachment's portable ref and active version before `erase()`. All three receipt projections consume that immutable evidence after commit instead of retaining the native item object.
7. Payload replacement also captures the created attachment's portable ref and active version before returning from the write helper. Success receipts consume those detached fields; only compensation retains the native item needed to remove an incomplete write.
8. One shared stored-score parser accepts either a bare canonical `literature_score.v1` artifact or the exact historical `{ version: 1, entry, format: "json", literature_score }` envelope and always returns the canonical inner artifact. Generic wrappers and external imports remain strict.
9. Managed singleton discovery receives the requested kind and skips a child only when its existing managed marker identifies a different known kind. Unknown, conflicting, and same-kind content still receives full inspection and fails closed when invalid.

## Risks / Trade-offs

- [Zotero `_key` is an internal pre-save slot] → Cover it through the real Zotero parent-set test and keep the use local to the native attachment adapter.
- [Old receipts may have no authority record] → Show bounded receipt diagnostics with an explicit unavailable-evidence state.
- [A run can contain several non-success sets] → Show one deterministic primary issue inline and retain every bounded non-success receipt in the diagnostic export.
- [Deletion evidence can become stale after capture] → Capture it immediately before the transactional erase; the receipt's `after` version remains the operation-derived deleted state.
- [Creation evidence is captured before transaction commit] → The attachment has already been saved and linked to the note at that point; the real-Zotero transaction test verifies that the same evidence remains sufficient after Zotero unloads the item.
- [A marker hint could hide conflicting content] → Skip only a different known kind; unknown or conflicting markers continue through the canonical inspection path, and direct reads of the unrelated artifact retain their typed diagnostics.
- [Compatibility could weaken the score contract] → Restrict compatibility to the exact persisted envelope emitted by the former producer and keep all producer/import validators on the bare canonical schema.

## Migration Plan

Build and reload the plugin, then use Continue to create a fresh scan. Existing run and authority records require no conversion and become diagnosable immediately. Rollback is the source change only; no stored schema or user data is rewritten by deployment.
