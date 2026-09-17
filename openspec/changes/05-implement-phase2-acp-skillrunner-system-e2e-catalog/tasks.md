# Tasks

## 1. Fixture and peer capabilities

- [ ] 1.1 Add the `normal`/`startup-stall`/`exit-during-turn`/`cancel-result-race` mode switch and the mode field in the evidence record to `tests/fixtures/acp/acp-composer-reply-agent.mjs`; verify the existing ACP contract tests that consume the fixture still pass and that an unrecognised mode fails closed instead of silently running normal behaviour.
- [ ] 1.2 Add a focused contract test for the ACP fixture's four modes (stall never answers the stalled phase, exit-during-turn ends the process without a JSON-RPC result, cancel-result-race emits trailing updates before a non-cancelled result); verify the test fails against the unextended fixture.
- [ ] 1.3 Add the handshake throttle option to `tests/mock-skillrunner/server.ts` and verify a focused test observes the delayed `/v1/system/handshake` while another request is in flight.
- [ ] 1.4 Add runner-controlled fixed-port restart to the Mock SkillRunner peer and verify a focused test proves the restarted peer serves the same port with an empty in-memory request table.

## 2. Runner process restart

- [ ] 2.1 Add runner-owned Zotero process termination and relaunch to `scripts/run-zotero-test-with-mock.ts`, preserving test data directory, endpoint environment, and test selection; verify the scheduling, environment, and argument builders through the existing script unit tests.
- [ ] 2.2 Add a focused regression test for restart termination confirmation and post-restart environment preservation; verify it fails before the restart capability exists.
- [ ] 2.3 Prove the restart capability against one existing e2e case before any Phase 2 case depends on it; verify the case reaches its assertions after the relaunch in a real Zotero run.

## 3. ACP transport and run lifecycle

- [ ] 3.1 Implement `AC-01` (normal ACP Skills run through to workflow apply); verify one durable run moves `queued -> running -> succeeded`, the request owner is preserved, apply state is succeeded with one typed mutation receipt, and exactly one bounded synthetic Zotero effect is created.
- [ ] 3.2 Implement `AC-02` (stalled startup cancellation); verify bounded adapter close, no `connected` publication, released Host queue slot and duplicate-submission identity, no orphan child, and successful admission of a follow-up submission.
- [ ] 3.3 Implement `AC-03` (unexpected child exit during a turn); verify the run reports an unexpected-exit lifecycle rather than idle close, stdout/stderr drain is bounded, no pipe or process leaks, and one typed terminal outcome is recorded.
- [ ] 3.4 Implement `AC-04` (cancel/result race); verify the prompt stays active until the original result settles, the interrupt reports `unconfirmed`, trailing transcript updates remain visible, and no premature force-close or canceled terminal is published.
- [ ] 3.5 Implement `AC-05` (active run restart reconciliation); verify the run settles once with reason `startup_reconcile`, conversation recovery is unavailable, stale active workflow ownership is removed, diagnostics survive, and no active prompt or queue slot remains.

## 4. ACP ownership and transcript semantics

- [ ] 4.1 Implement `AO-01` (write approval stays conversation-owned); verify each approval and result routes only to its invoking conversation over one Host Bridge connection, scopes/pending cards/operation identities/terminal evidence do not cross, each approved write produces one effect, and each denied write produces none.
- [ ] 4.2 Implement `AT-01` (side-channel updates do not split assistant text); verify ACP Chat and ACP Skills each retain one stable assistant text segment across interleaved `tool_call_update`, usage, status, and workspace activity until a true hard boundary, and publish the same semantic transcript through the real chrome frame.
- [ ] 4.3 Add focused lower-layer regression coverage for the fixture-driven boundary classification used by 4.2; verify it fails when a side-channel update is treated as a hard boundary.

## 5. SkillRunner submission, reconciliation, and apply

- [ ] 5.1 Implement `SR-01` (normal submission through broker mutation); verify `request_ready`, one provider terminal success, one apply success, one typed mutation receipt, and exactly one synthetic Zotero effect.
- [ ] 5.2 Implement `SR-02` using the runner-owned process kill after durable `apply.started`; verify the reconciler classifies the apply as ambiguous/unrecoverable, performs no backend repoll or broker redispatch, exposes one typed recovery failure, and leaves at most the effect observed before termination.
- [ ] 5.3 Add the local one-shot operation-scoped checkpoint after durable `apply.started` only if 5.2 cannot be hit deterministically, and verify through a focused lower-layer test that it fires once per operation, is absent from production behaviour, and cannot be reached through production configuration; record whether it was needed in the case evidence.
- [ ] 5.4 Implement `SR-03` (missing backend request reconciles once); verify the restarted peer loses the request, the run terminalises exactly once with its typed missing-request reason, the task and queue slot are released, no apply occurs, and a follow-up submission is admitted.
- [ ] 5.5 Implement `SR-04` (busy backend handshake keeps the submission lane); verify the execution-preflight handshake runs on the submission lane while the throttle is active and is not skipped as a background health probe, and assert no duplicate execution or terminal ambiguity results.

## 6. Real-host publication and platform composition

- [ ] 6.1 Implement `AW-01` (SkillRunner detach/reattach preserves publication identity); verify transcript revision stays monotonic across close and reopen, the run and validated reply payload remain current, and transcript updates do not rebuild unrelated managed regions.
- [ ] 6.2 Implement `AW-02` (Linux chrome iframe publishes a completed transcript); verify a completed SkillRunner run with at least one transcript boundary renders its row in the Linux Zotero chrome iframe without a forced timer probe.
- [ ] 6.3 Implement `AP-01` (Windows ACP Skill materialization uses native paths); verify workspace roots are materially present through Zotero native file APIs with native path syntax, and readiness is published only after materialization succeeds.

## 7. Serial catalog execution

- [ ] 7.1 Declare the Family Namespace, Owned State, and restart-preserved state for the two restart cases, and verify every other family cleans up before yielding the profile.
- [ ] 7.2 Run all fourteen cases serially on Zotero 10/Linux through `npm run test:zotero:e2e` in one copied profile; verify the Run Manifest is terminal and complete with per-case public/typed, lifecycle, cleanup, and Suite Health Gate evidence, and with no undeclared carry-over.
- [ ] 7.3 Run `AP-01` on Zotero 10/Windows and verify a trustworthy terminal manifest with native-path materialization evidence; record a skipped Windows run as skipped rather than as a pass.

## 8. Documentation and verification

- [ ] 8.1 Update `docs/dev/zotero-e2e.md` with the Phase 2 operator notes: the ACP fixture modes, the peer throttle and restart controls, the Linux serial run, the Windows `AP-01` lane, and whether the `SR-02` fallback checkpoint was required.
- [ ] 8.2 Run the focused Node contract tests for both peers, the fixture modes, the runner restart path, and the boundary classification; verify they pass and that no Contract Integration case was duplicated at the System E2E layer.
- [ ] 8.3 Run type check, lint, formatting, and build; verify no production module gained a reachable fault interface and no new blocking CI cell was added.
- [ ] 8.4 Run strict OpenSpec validation for this change; verify it reports valid with the zero-delta `skip_specs` acknowledgement, and confirm no `specs/` directory was created.
