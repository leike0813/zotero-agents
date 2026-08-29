Implementation baseline: `4dbddc24e884921262c559428bf851db5eadf2d7`. This companion does not activate or extend Workflow Host v12.

## 1. One-Shot Interface Tests

- [ ] 1.1 Add a focused platform-subprocess interface test covering normalized stdout/stderr/exit, unavailable adapters, timeout, bounded termination, Node, Mozilla/XPCOM, and Windows hidden execution; verify it fails against the current re-export.
- [ ] 1.2 Extend `test/core/164-runtime-platform-services.test.ts`, `test/core/165-runtime-platform-services.zotero.test.ts`, `test/core/98-acp-transport.test.ts`, and `test/node/core/74-skillrunner-ctl-bridge.test.ts` with observable integration cases that preserve domain ownership.

## 2. Platform Owner

- [ ] 2.1 Replace the re-export in `src/platform/subprocess.ts` with a small one-shot request/result interface, invocation-late host module resolution, Node/Mozilla adapters, output capture, timeout, and bounded termination; verify focused interface tests pass.
- [ ] 2.2 Keep command discovery in `src/platform/command.ts` and login-environment policy in `src/platform/env.ts`; verify platform tests demonstrate that the subprocess module receives resolved execution input rather than searching commands or building environments.

## 3. Caller Migration

- [ ] 3.1 Migrate `src/modules/acpRuntimeDependencyWrapper.ts`, `skillRunnerLocalRuntimeManager.ts`, and `skillRunnerCtlBridge.ts` to the one-shot seam while preserving their timeouts, diagnostics, and domain outcomes; verify their focused tests pass.
- [ ] 3.2 Migrate `src/modules/synthesis/gitSyncCommandAdapter.ts`, `hostBridgeCliInstaller.ts`, and `hostBridgeCliInstallPrompt.ts`; verify Git and installer tests preserve recovery and user-visible outcomes.
- [ ] 3.3 Adapt `src/modules/acpTransport.ts` and `acpWebSocketBridgeService.ts` only where they consume shared resolution; verify streaming, pipe drain, process-group, graceful/forced close, ready/health/shutdown, and audit behavior remain owned and pass existing tests.

## 4. Approved Deletions

- [ ] 4.1 Remove `getMozillaSubprocessModule` from `src/utils/runtimeCompatibility.ts`, the shallow `platform/subprocess.ts` re-export implementation, and caller-local equivalent selectors; verify production references are zero.
- [ ] 4.2 Remove shallow re-export/fallback-order tests only after replacement interface evidence passes; verify no command, ACP, bridge, Git, installer, dependency-probe, or SkillRunner observable test is deleted.

## 5. Completion

- [ ] 5.1 Run platform-subprocess, runtime-platform, ACP, SkillRunner, Git, and installer focused tests, then `npm run test:node:core`, `npm run build`, lint checks, and `openspec validate 02p-consolidate-platform-subprocess-one-shot-seam --strict --no-interactive`; record pass/fail/not-run evidence.
- [ ] 5.2 Report normalized one-shot evidence, Windows hidden adapter evidence, lifecycle ownership preservation, and zero approved-symbol/caller-selector findings in the change verification handoff.
