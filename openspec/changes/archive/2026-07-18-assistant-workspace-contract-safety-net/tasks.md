## 1. TDD Coverage

- [x] 1.1 Add `test/core/190-assistant-workspace-wire-drift.test.ts` comparing TS and JS wire field registries (envelope, per-kind payloads, transcript forms, permission request, forbidden fields) with kind-and-field diff messages; verify red/green by sabotage experiment.
- [x] 1.2 Add producer self-check tests (valid pass, malformed throw when enabled, no assert when disabled or outside debug mode).
- [x] 1.3 Rebuild `test/core/184` fixtures from production constructors; add smoke assertions for the two documented exceptions (service-status, acp-skills owner-details).
- [x] 1.4 Rewrite `test/core/71` as behavior-level snapshot production/consumption contract tests with Proxy field-path diffing; delete assertions covered by 65/83/84.
- [x] 1.5 Deepen `test/core/97` region-isolation invariants to full-subtree node identity.

## 2. Wire Registries

- [x] 2.1 Hoist and export TS wire field lists (`assistantWorkspacePublication.ts`): envelope, payload-by-kind, transcript snapshot/delta, permission request keys, forbidden fields.
- [x] 2.2 Hoist JS validator key lists and export `window.AssistantWorkspaceAcpChild.wireFieldRegistry`; align `forbiddenWireFields` to the host's 15-field set.

## 3. Producer Self-Check

- [x] 3.1 Add `WORKSPACE_PUBLICATION_WIRE_ASSERT_ENABLED` flag, esbuild define, global declaration, availability and test-override functions.
- [x] 3.2 Assert at `AssistantWorkspacePublicationCoordinator.createPublication` when the flag and debug mode are both on.

## 4. SkillRunner Boundary

- [x] 4.1 Capture production `RunWorkspaceSnapshot` via `attachSkillRunnerSidebarHost` in a shared test helper; use it in the rewritten 71 and in 97's SkillRunner envelope.

## 5. Specifications And Documentation

- [x] 5.1 Update `artifact/assistant-workspace-refactor-plan-20260718.md` Phase 0 notes (97 premise correction, found drift, Phase 2 FakeDocument decision).
- [x] 5.2 Land this OpenSpec change with spec deltas and pass strict validation.

## 6. Verification

- [x] 6.1 Focused Node tests (97/184/190) and TypeScript type checking; ESLint on changed files.
- [x] 6.2 Run `npm run test:node:core` (2555 passing; one pre-existing, unrelated Host Bridge executable-bit failure in `test/core/139`) and the `test:gate:pr` stages (`check:localization-governance`, `check:ssot-invariants`, real-Zotero `test:lite` 39 passed, exit 0).
- [x] 6.3 Run strict OpenSpec validation.
