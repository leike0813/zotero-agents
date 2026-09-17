# Design

## Context

Implementation prerequisite: read [`artifacts/e2e-wayfinder/system-e2e-implementation-handoff.md`](../../../artifacts/e2e-wayfinder/system-e2e-implementation-handoff.md) before applying this change. It is the self-contained source for the Wayfinder decisions and replaces issue-tracker lookup.

See proposal.md for motivation. The implementation consumes contracts that the earlier changes own, and must not restate or fork them:

- `01-establish-system-e2e-runner-foundation` owns the Run Manifest, the Committed Seed identity/validation contract, the active fixture registry, the family lifecycle (Family Namespace, Owned State, Carry-over Set, cleanup), the Suite Health Gate, and the execution-membership rule (test directories, no parallel scenario registry).
- `02-add-system-e2e-fault-control-and-sidecar-recovery` owns the external fault-control vocabulary: process, copied-file, lock, port, disconnect, and restart, plus the precedent for a local one-shot operation-scoped checkpoint when no external control can produce the fault.
- `03` and `04` own the Phase 1 cases and the compatibility execution matrix.
- `zotero-plugin.config.ts` already discovers `tests/zotero/e2e/full` recursively for `ZOTERO_TEST_DOMAIN=e2e`; `scripts/run-zotero-test-with-mock.ts` already starts the Mock SkillRunner and injects `ZOTERO_TEST_SKILLRUNNER_ENDPOINT` into the Zotero process. Both stay the only entry points.

Existing production seams the cases drive, unchanged: `acpTransport` / `acpConnectionAdapter` (launch, bounded startup, cancel), `acpSkillRunnerOrchestrator` and `acpSkillRunPersistence.startupReconcile` (`startup_reconcile` reason), `workflowExecution/applySeam` and `skillRunnerForegroundContinuation` (`apply.started` / `apply.succeeded` / `apply.failed`), `skillRunnerConnectionGovernor` (submit vs. background/health lanes), `acpSkillRunTranscriptBoundary` (assistant text segment boundaries), and the Assistant Workspace publication plane.

## Goals / Non-Goals

**Goals:**

- Fourteen cases drive only public or production-internal entry points, and assert user-visible state, durable typed run/apply/mutation evidence, transport lifecycle facts, bounded Zotero counts, and process/cleanup facts.
- One ACP peer, one SkillRunner peer, one runner.
- All fourteen cases pass serially on Zotero 10/Linux in one copied profile with one Suite Baseline, declared carry-over only, and complete cleanup/health evidence.
- `AP-01` is runnable on Windows Zotero 10 without touching the Linux placement.

**Non-Goals:**

- New blocking CI placement. `04` owns the matrix; this change only makes the cases runnable through existing commands.
- Protocol-shape matrices, ACP/SkillRunner transition tables, digest/retention matrices, transcript LRU/cursor internals, quoting matrices, and package/schema governance. Those stay at Contract Integration level.
- Expanding the Committed Seed with private or identifying data.
- A global fault-injection interface or any production-visible test seam beyond, at most, one local one-shot checkpoint.

## Decisions

### One ACP child fixture with env-selected modes

`tests/fixtures/acp/acp-composer-reply-agent.mjs` already implements `initialize`, `session/new`, and `session/prompt` over NDJSON and already appends a per-request evidence record. The four catalog modes are added as a mode switch on the existing line handler rather than a sibling fixture:

| Mode | Behaviour | Case |
| --- | --- | --- |
| `normal` | Current behaviour; also emits a synthetic manual-approval prompt path used by `AO-01` and a text/side-channel interleave used by `AT-01` | `AC-01`, `AO-01`, `AT-01` |
| `startup-stall` | Delays the `initialize` (or `session/new`) response past the bounded startup window and records whether it was ever answered | `AC-02` |
| `exit-during-turn` | Exits the process on a controlled trigger after `session/prompt` was accepted, without a JSON-RPC error | `AC-03` |
| `cancel-result-race` | On `session/cancel` notification, waits a short bounded delay, emits trailing `session/update` frames, then returns a **non-cancelled** `session/prompt` result | `AC-04` |

Alternative: a second fixture per fault. Rejected — the transport, launch plan, and backend wiring are identical for all five cases, so a second peer would duplicate the launcher and introduce a peer-identity difference that is not part of any assertion.

The mode is selected through the backend's `env` (already part of `BackendInstance`) so no new launch mechanism is needed. The existing evidence file keeps its per-request `sequence/method/id/sessionId/promptText` record; the mode is added to that record so a case can prove which peer behaviour it actually exercised.

### One SkillRunner peer, extended twice

`tests/mock-skillrunner/server.ts` already binds `host`/`port` and already accepts a `handshake` override. Two additions:

- handshake throttle: an optional delay on the `/v1/system/handshake` response, applied before the response is written, so a submission can start while ordinary backend work is still in flight (`SR-04`).
- fixed-port restart: the runner restarts the peer on the same port after a controlled stop, which naturally discards its in-memory `jobs` map and produces the durable-request-without-backend condition (`SR-03`). The existing `ZOTERO_MOCK_SKILLRUNNER_PORT` knob already supports pinning; only a runner-controlled stop/start cycle is new.

Alternative: a new peer that simulates a lost request table. Rejected — restart already produces exactly that condition, and a second peer would not exercise the real port and reconnect path.

### Runner-owned process restart for cross-restart cases

`AC-05` and `SR-02` both need the Zotero process to terminate and relaunch against the **same** copied profile, because the evidence they assert is startup reconciliation over durable state. `scripts/run-zotero-test-with-mock.ts` gains one capability: terminate the Zotero child and relaunch it with the same `ZOTERO_TEST_DATA_DIR`, endpoint environment, and test selection, then continue the current case instead of asserting across a separate process boundary.

Alternative: run the pre-restart and post-restart halves as two separate invocations and correlate by fixture identity. Rejected — reconciliation semantics depend on the same profile generation, and correlating two invocations would let a case pass while reconciliation never actually saw the durable record.

The restart is a runner control, not a case control. Cases request it through the same runner-owned surface the other fault controls use, so a case cannot restart Zotero outside a declared family boundary.

### `SR-02` prefers kill; one checkpoint only as a fallback

The primary mechanism is a runner-owned kill of the Zotero process after the run store has durably recorded `apply.started` for the request. The case then relaunches and asserts the reconciler classifies the apply as ambiguous/unrecoverable, performs no backend repoll or broker redispatch, exposes one typed recovery failure, and leaves at most the pre-termination effect.

If that boundary cannot be hit deterministically from public evidence, the fallback is one local, one-shot, operation-scoped checkpoint inside the applying SkillRunner owner, immediately after the durable `apply.started` record. It is scoped to one operation, fires once, and is enabled only under the test runtime; it is not a global fault interface, not reachable through production configuration, and not a pass-through module. Whether the checkpoint was needed is recorded in the case's evidence and in `docs/dev/zotero-e2e.md`.

### Cases assert typed and observable evidence only

Every case asserts some subset of: the applicable user-visible state, durable typed run/apply/mutation evidence, transport lifecycle facts (unexpected exit vs. idle close, bounded drain, no orphan process/pipe), bounded Zotero counts or canonical refs, and process/cleanup facts. No case asserts full log prose, UI copy, private call order, complete persistence rows, or raw local paths.

`AC-01` and `SR-01` stop at producer/apply convergence plus one typed receipt and one observable Zotero effect; they do not re-derive digest, retention, or broker-operation matrices.

`AO-01` and `AT-01` are grouped because both need two owners over one connection and the real chrome frame; `AW-01` and `AW-02` are grouped because both need a live run behind the real sidecar iframe.

### Serial execution in one copied profile

All Linux cases live under `tests/zotero/e2e/full` and therefore execute through the existing e2e domain. The two restart cases declare the profile state they preserve across the restart; every other family cleans up before yielding the profile. No case may depend on a sibling case having run.

### `AP-01` runs on Linux and proves the platform-specific path again on Windows

`AP-01` participates in the complete Zotero 10/Linux catalog so the fourteen-case invocation proves the shared materialization and readiness contract. The same case additionally runs on Zotero 10/Windows, where it must prove that workspace Skill roots are materially present through Zotero native file APIs, retain Windows-native path syntax, and publish readiness only after materialization succeeds. Both runs reuse the same fixture and ACP Chat public path.

## Risks / Trade-offs

- **Risk:** bounded ACP startup windows are long (60 s per phase), so `AC-02` can add minutes to the Linux run. → `startup-stall` stalls exactly one phase, and the assertion checks the release of the slot rather than waiting for the stalled phase to finish.
- **Risk:** the restart cases can leave a half-dead Zotero process or a locked profile and contaminate later families. → The runner's restart path owns termination confirmation and the post-family Suite Health Gate; a non-clean restart fails the family closed instead of continuing.
- **Risk:** extending the shared ACP fixture can regress its current evidence contract. → The new modes are additive on the existing handler; the existing per-request record shape is preserved and only extended.
- **Risk:** the `SR-02` checkpoint could drift into a production fault interface. → It is one-shot, operation-scoped, enabled only by the test runtime, and inspected by a focused lower-layer regression test.
- **Risk:** the Windows lane needs a real Windows host and can be skipped, hiding a regression. → `AP-01` is non-gating by design; the Linux catalog acceptance does not depend on it, and a skipped Windows run is recorded as such rather than as a pass.
- **Risk:** a case that asserts transcript boundary semantics could lock implementation detail. → Assertions go through the real publication/render composition and check segment stability and region identity, not internal scheduler or cache state.

## Migration Plan

1. Extend the ACP fixture modes and its evidence record; extend the Mock SkillRunner peer with the handshake throttle and fixed-port restart. Verify the existing contract tests for both peers still pass.
2. Add the runner-owned process-restart capability and verify it against an existing e2e case before any Phase 2 case depends on it.
3. Implement the cases in dependency order: `AC-01` (normal producer path) first, then the recovery and ownership cases, then `SR-01`..`SR-04`, then `AW-01`/`AW-02`.
4. Run the full Linux catalog serially in one copied profile and confirm cleanup, health, and a complete Run Manifest.
5. Run `AP-01` on Zotero 10/Windows and record its manifest separately.
6. Update `docs/dev/zotero-e2e.md` with the Phase 2 operator notes and whether the `SR-02` fallback checkpoint was required.

Rollback is a normal source revert. No product runtime data, external state, or published artifact is migrated, and no CI cell is promoted by this change.

## Open Questions

None. The only conditional decision — whether `SR-02` needs its fallback checkpoint — is expressed as an evidence-gated fallback in Decisions, and does not change the specs, the approach, or the task breakdown.
