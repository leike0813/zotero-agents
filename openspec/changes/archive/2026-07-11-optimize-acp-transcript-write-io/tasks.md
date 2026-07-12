## 1. Buffered write foundation

- [x] 1.1 Add the owner/file-scoped buffered-write coordinator with bounded timer, byte, and entry thresholds, serialized drains, flush APIs, retry retention, and test diagnostics/reset.
- [x] 1.2 Add focused coordinator coverage for burst batching, entries arriving during drain, owner isolation, forced flush, failure retry, and diagnostics.

## 2. Shared transcript and index persistence

- [x] 2.1 Route ACP Skills and ACP Chat transcript events through one owner-scoped buffered transcript writer while keeping mirror and UI delta updates synchronous.
- [x] 2.2 Coalesce adjacent compatible `append_text` events per batch and replace per-chunk durability bookkeeping with one shared owner promise.
- [x] 2.3 Upgrade the derived transcript index to v2 with source byte length, bounded checkpoints, incremental tail recovery, full rebuild fallback, and dirty retry semantics.
- [x] 2.4 Implement target-owner transcript/index durability barriers for reads, user/interaction/terminal/apply/lifecycle boundaries, background release, and shutdown.

## 3. Metadata persistence

- [x] 3.1 Add trailing persistence for ACP Skills transcript-only, usage, workspace activity, and non-terminal tool updates while preserving immediate semantic boundaries.
- [x] 3.2 Add the equivalent ACP Chat soft tool/status throttle, stable lifecycle-event deduplication, and shutdown metadata drain.

## 4. Plugin-owned audit streams

- [x] 4.1 Replace whole-file audit pseudo-append with sanitized buffered true append for timeline, ACP update, and transport streams without changing bridge ownership.
- [x] 4.2 Add audit owner flushes at prompt/terminal/close/disconnect/run/diagnostic/shutdown boundaries and retain failed batches for best-effort retry.

## 5. Regression coverage and validation

- [x] 5.1 Extend `171-acp-runtime-memory-governance` for transcript burst batching, immediate mirror visibility, coalescing correctness, index v2 recovery, and terminal/shutdown drains.
- [x] 5.2 Extend `96-acp-session-manager-transcript` for target-only reads, owner isolation, owner-first switching, and cold durability after user/lifecycle/shutdown boundaries.
- [x] 5.3 Extend `107-acp-skillrunner-compatible-runner` for complete physically batched audit files, no whole-file reads, boundary completeness, debug-off behavior, and bridge ownership.
- [x] 5.4 Run the three focused test files, TypeScript, Prettier check, ESLint, core Node regression, and strict OpenSpec validation.
