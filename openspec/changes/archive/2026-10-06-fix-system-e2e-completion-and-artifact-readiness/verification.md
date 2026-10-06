# Verification

## Root causes and fixes

The prior owner-resume guards skipped ordinary Phase 2 after HB-03, and the outer command returned only the final process's exit status. Actual Mocha test identities now supply the selected set after grep is applied. Recovery removes completed tests before hooks, while the existing outer collector retains terminal results and family evidence across every process. The final summary and exit code use that logical-run verdict. Reporter events are acknowledged by the outer sink before scaffold completion, and progress events drain before end.

PA-02 failed through exact artifact readiness: inspection of a child note exceeded the existing 1 MiB bound and escaped the shared detach boundary. The shared boundary now isolates only typed Managed Note/codec resource-limit failures, preserving independently valid neighbors. Direct note detail bounds, cancellation and other failure handling remain intact.

## Node and static checks

The focused Node command was:

```sh
node_modules/.bin/tsx node_modules/mocha/bin/mocha tests/zotero-host/91-zotero-test-infrastructure.test.ts tests/synthesis/178-synthesis-host-read-ports.test.ts tests/zotero-host/131-zotero-compatibility-fixture.test.ts --require tests/setup/zotero-mock.ts --timeout 10000 --exit
```

- Existing infrastructure tests, Synthesis Host read-port tests and compatibility fixture tests: **155 passing**, 4 existing platform-conditioned pending.
- Existing Broker oversized HTML/payload public detail tests: **2 passing**.
- Final collector, real Mocha selection and reporter checks after event-ordering changes: **19 passing**.
- `tsc --noEmit`, targeted ESLint and Prettier checks: passed.
- `openspec validate fix-system-e2e-completion-and-artifact-readiness --strict` and `git diff --check`: passed.

The aggregate regression first returned `complete` after an earlier failed case; the real Mocha/reporter regression first omitted selection. The readiness regressions first threw typed resource errors for oversized HTML and payload attachment. All are green after the fixes. Real grep validation also caught that Mocha applies grep after reporter construction; selection now runs at the start event. An invalid-family regression also proved that a throwing async start listener could otherwise allow cases to execute; selection exceptions now become a failing suite hook that blocks them.

## Linux System E2E

The current local host reports **Zotero 10.0.5 / Linux x64**; its installation directory label is 10.0.2. Tests used the existing command, scaffold test profile/data and the current-source local Rust sidecar. A temporary cleanup override limited termination to this workspace's scaffold profile. No source library/profile was modified.

With `ZOTERO_TEST_GREP='System E2E runner foundation|PA-02'`, the entry selected and passed **2 cases**, recorded `complete`, and exited 0:

`artifacts/test-diagnostics/system-e2e/3e15c532-b105-4c82-b784-83824b4f34db/run-manifest.json`

The default `npm run test:zotero:e2e` selected and passed **31 cases**, recorded `complete`, and exited 0. Its 30 family records cover foundation, fifteen Phase 1 and fourteen Phase 2 cases; Index smoke supplies the separate thirty-first result. HB-03, AC-05 and SR-02 each resumed once. Both case and family identities are unique; no selected evidence is missing:

`artifacts/test-diagnostics/system-e2e/ce4404bc-6696-48e5-b235-363e57033dd3/run-manifest.json`

With `ZOTERO_SYSTEM_E2E_FAMILIES=PA` and grep selecting foundation, PA-02 and AC-01, only foundation and PA-02 were selected. Both passed, the manifest is `complete`, and the entry exited 0:

`artifacts/test-diagnostics/system-e2e/b78946b9-965c-4a83-b1d9-16b1c66303c4/run-manifest.json`

That family-selection run printed an esbuild service deadlock diagnostic after the Mocha completion message. The command still exited 0 and all expected case/family evidence was complete. Repeating the same command passed both cases, produced `complete`, exited 0 and did not reproduce the diagnostic:

`artifacts/test-diagnostics/system-e2e/abd4a209-5f54-46bc-bed1-723dffd80d73/run-manifest.json`

The default full run and focused PA-02 run also had no such diagnostic. No third-party dependency was changed to address this isolated teardown observation.

This change does not claim Zotero 7/9, Windows or macOS acceptance.

## Changed files

- `scripts/run-zotero-test-with-mock.ts`: passes completed case IDs into recovery and returns the aggregate verdict.
- `scripts/system-e2e/manifest.ts`: validates immutable selection, sticky failures, terminal case results and required family evidence; persists cases and summary.
- `scripts/patch-zotero-test-runner.ts`: publishes selection after actual grep, reports stable case IDs, blocks invalid selection and flushes mirrored events before completion.
- `tests/zotero/systemE2ECases.ts` and `tests/zotero/e2e/full/300`–`303` declarations: attach metadata to real tests, apply family selection and remove completed tests before hooks.
- `src/modules/zoteroHost/libraryArtifactReadiness.ts`: isolates typed per-note resource limits at the shared boundary.
- `tests/zotero-host/91-zotero-test-infrastructure.test.ts` and `tests/synthesis/178-synthesis-host-read-ports.test.ts`: extend existing behavioral regressions.
- `docs/dev/zotero-e2e.md` and this OpenSpec change: document execution/completion contracts and acceptance evidence.

The user's existing `AGENTS.md` diff was preserved. No code was committed.
