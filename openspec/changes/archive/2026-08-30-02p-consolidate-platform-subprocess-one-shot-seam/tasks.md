Implementation baseline: `4dbddc24e884921262c559428bf851db5eadf2d7`. This companion does not activate or extend Workflow Host v12.

## 1. One-Shot Interface Tests

- [x] 1.1 Add a focused platform-subprocess interface test covering normalized stdout/stderr/exit, unavailable adapters, timeout, bounded termination, Node, Mozilla/XPCOM, and Windows hidden execution; verify it fails against the current re-export.
- [x] 1.2 Extend `test/core/164-runtime-platform-services.test.ts`, `test/core/165-runtime-platform-services.zotero.test.ts`, `test/core/98-acp-transport.test.ts`, and `test/node/core/74-skillrunner-ctl-bridge.test.ts` with observable integration cases that preserve domain ownership.

## 2. Platform Owner

- [x] 2.1 Replace the re-export in `src/platform/subprocess.ts` with a small one-shot request/result interface, invocation-late host module resolution, Node/Mozilla adapters, output capture, timeout, and bounded termination; verify focused interface tests pass.
- [x] 2.2 Keep command discovery in `src/platform/command.ts` and login-environment policy in `src/platform/env.ts`; verify platform tests demonstrate that the subprocess module receives resolved execution input rather than searching commands or building environments.

## 3. Caller Migration

- [x] 3.1 Migrate `src/modules/acpRuntimeDependencyWrapper.ts`, `skillRunnerLocalRuntimeManager.ts`, and `skillRunnerCtlBridge.ts` to the one-shot seam while preserving their timeouts, diagnostics, and domain outcomes; verify their focused tests pass.
- [x] 3.2 Migrate `hostBridgeCliInstaller.ts` and `hostBridgeCliInstallPrompt.ts`; verify installer tests preserve recovery and user-visible outcomes. Keep retired Synthesis Git Sync absent and do not route Rust sidecar WebDAV through subprocess.
- [x] 3.3 Adapt `src/modules/acpTransport.ts` and `acpWebSocketBridgeService.ts` only where they consume shared resolution; verify streaming, pipe drain, process-group, graceful/forced close, ready/health/shutdown, and audit behavior remain owned and pass existing tests.

## 4. Approved Deletions

- [x] 4.1 Remove `getMozillaSubprocessModule` from `src/utils/runtimeCompatibility.ts`, the shallow `platform/subprocess.ts` re-export implementation, and caller-local equivalent selectors; verify production references are zero.
- [x] 4.2 Remove shallow re-export/fallback-order tests only after replacement interface evidence passes; verify no command, ACP, bridge, installer, dependency-probe, or SkillRunner observable test is deleted.

## 5. Completion

- [x] 5.1 Run platform-subprocess, runtime-platform, ACP, SkillRunner, dependency-probe, and installer focused tests, then `npm run test:node:core`, `npm run build`, lint checks, and `openspec validate 02p-consolidate-platform-subprocess-one-shot-seam --strict --no-interactive`; record pass/fail/not-run evidence.
  - Focused evidence: runtime platform `47 passing, 6 pending`; ACP transport `42 passing`; SkillRunner ctl `15 passing`; SkillRunner local runtime `40 passing, 4 pending`; dependency probe `13 passing`; Host Bridge install/prompt `61 passing, 1 pending`.
  - Final gates: Node Core `3110 passing, 65 pending`; build passed; changed-file Prettier and ESLint passed; strict OpenSpec validation passed. Full-repository `lint:check` remains blocked by 15 unmodified Synthesis Prettier files, and standalone full-repository ESLint remains blocked by the unmodified `src/workflows/workflowHostErrorContract.ts` `no-control-regex` finding.
  - Not run: the live Zotero case in `test/core/165-runtime-platform-services.zotero.test.ts` and a real Windows Zotero hidden-console launch; the Node gate records these runtime-only cases as pending.
- [x] 5.2 Report normalized one-shot evidence, Windows hidden adapter evidence, lifecycle ownership preservation, and zero approved-symbol/caller-selector findings in the change verification handoff.
  - Normalized output/exit, unavailable, timeout, bounded termination, production Node, invocation-late Mozilla, and feature-detected hidden XPCOM cases passed. ACP streaming/process-group/close and bridge/supervisor lifecycle remain in their domain owners.
  - Zero-finding scans: removed `runtimeCompatibility` Mozilla resolver/type/extractor `0`; shallow resolver re-export imports `0`; migrated caller-local one-shot selector names `0`; production Synthesis Git Sync subprocess adapter references `0`.
