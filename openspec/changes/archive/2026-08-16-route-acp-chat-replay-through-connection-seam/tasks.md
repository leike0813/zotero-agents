## 1. Synthetic Adapter Contract

- [x] 1.1 Add failing tests for synthetic adapter update/diagnostic/permission emission, permission resolve, session identity, close, and timer inspection.
- [x] 1.2 Implement `acpSyntheticConnectionAdapter.ts` until the adapter tests pass.

## 2. Session Manager Seam

- [x] 2.1 Add scoped factory registry and backend admission tests.
- [x] 2.2 Implement `registerAcpConnectionAdapterFactory` / `unregisterAcpConnectionAdapterFactory`, scoped factory selection, and backend admission.
- [x] 2.3 Add ACP Chat `user_message_chunk` transcript handling with tests.

## 3. Replay Target Migration

- [x] 3.1 Add deterministic replay chat session identity and owner mapping.
- [x] 3.2 Migrate `acpRuntimeReplayTargets` chat target to scoped factory + connect path + adapter events.
- [x] 3.3 Migrate `acpRuntimeReplayProductionPorts` timer inspection to the synthetic adapter inspector.
- [x] 3.4 Delete replay-specific exports and lease state from `acpSessionManager`.

## 4. Test and Documentation

- [x] 4.1 Rewrite direct synthetic replay tests in `96-acp-session-manager-lifecycle`.
- [x] 4.2 Update `acp-chat-session-management` and `acp-runtime-replay-profiler` specs.
- [x] 4.3 Run focused ACP/replay tests (96 lifecycle, 179, 180, 181, 197, 107, 108), type checks, and lint. `97-runtime-diagnostics-release-elision` still fails identically on the Candidate-01 baseline (`inspectSyntheticAcpSkillRunReplayTimers` / `prepareSyntheticAcpSkillRunReplay` markers), so it is pre-existing and unrelated to this change.
