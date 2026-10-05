# Verification

Baseline: `e2006593d5809cbde790d8f3cbf3d822fa7fef2f`. This is a local working-tree change; no commit or release acceptance is claimed.

## Implemented scope

Both Pi owners compose the independent 29-tool Synthesis catalog. Existing Synthesis search names are preserved. Inputs use canonical protocol definitions; maintenance records the canonical operation, call and original source turn through the existing owner writer. Internal operation evidence is excluded from model context.

Context files and filtered export directories use C08. Export publication preserves the original manifest and relative paths, validates Gecko headers before extraction, bounds enumeration and workspace footprint, stages privately, and publishes only after successful extraction cleanup. The managed-file manifest and sidecar protocol are unchanged. Native file tools now claim the trusted workspace resource.

## Automated checks

| Check                                                                                              | Result                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `tsx scripts/run-node-test-shards.ts --shard runtime-provider-execution`                           | Pass, all 20 files, including new catalog/binding suites and both owner suites                    |
| Mocha archive 91, workspace 248 and Synthesis catalog 302                                          | Pass, 59 tests after final extraction changes                                                     |
| Mocha Synthesis native composition 220                                                             | Pass, 33 tests; fixture diagnostics assert semantic categories rather than unstable array offsets |
| Mock OpenAI fixture 277                                                                            | Pass, 7 tests                                                                                     |
| Scoped ESLint and Prettier                                                                         | Pass for all changed TypeScript, domain documents and change artifacts                            |
| `ZOTERO_PLUGIN_DIST=.scaffold/pi-synthesis-build npm run build`                                    | Pass, production browser build, workspace types, root types and sidebar/dashboard/Synthesis types |
| `tsx scripts/run-zotero-compatibility-matrix.ts prepare --build-root .scaffold/pi-synthesis-build` | Pass, current-source Rust sidecar built and staged                                                |
| `openspec validate add-pi-synthesis-client-tools --strict`                                         | Pass                                                                                              |

Final prepared artifact:

- Plugin digest: `1b1bc4983101cd1d29c41f4a8df3d265ac85ca0c54c821a35ca8854243859196`.
- Sidecar fingerprint: `90a9989a539bcb3b0018174c9ff14a59af9ff6a07cce6b7c224418d0c09343a7`.
- Sidecar target: `linux-x64`.

## Real-host evidence

The existing compatibility runner uses isolated run roots under `/tmp/pi-synthesis-host-acceptance`. The user's live profile is untouched. A temporary entry imports the existing canary; it does not introduce a runner.

| Linux host    | Existing core canary 284                                    | Receipt                                     |
| ------------- | ----------------------------------------------------------- | ------------------------------------------- |
| Zotero 7.0.32 | 7 passed, including real Synthesis maintenance submit/query | `zotero-7-linux-x64-69703bf9/receipt.json`  |
| Zotero 9.0.6  | 7 passed, including real Synthesis maintenance submit/query | `zotero-9-linux-x64-dc22af87/receipt.json`  |
| Zotero 10.0.1 | 7 passed, including real Synthesis maintenance submit/query | `zotero-10-linux-x64-a17ad7fc/receipt.json` |

Core runs precede the final extraction hardening. Final-build installed-owner export evidence is recorded separately below. The first broad core entry was blocked by an existing prototype artifact mapping; the focused existing entry passed. Full E2E export canary 308 is opt-in with `ZOTERO_PI_SYNTHESIS_TOOLS=1`, uses the existing deterministic provider, and invokes the installed plugin through its public UI. Its structural export observation is separate from formal release-family acceptance.

Windows real-host acceptance is delegated to the user, who explicitly requested no Windows run in this session. No Windows result is inferred from Linux or Node checks.

## Installed-owner directory export

Zotero 7.0.32, 9.0.6 and 10.0.1 each passed canary 308 with one real export submission, `completed` / `confirmed_complete`, and an actual owner workspace directory containing `runtime/payloads/paper-artifacts-manifest.json`. Missing-artifact semantics and the manifest are supplied by the real sidecar. Nested populated artifact export is additionally covered by the Node integration suite.

- Linux 10 observation: `/tmp/pi-synthesis-export-linux10.json`; runner log: `zotero-10-linux-x64-48c705cd/e2e-af29b7fc/diagnostics/runner.stdout.log`.
- Linux 9 observation: `/tmp/pi-synthesis-export-linux9.json`; runner log: `zotero-9-linux-x64-b77f3a94/e2e-77e04cb2/diagnostics/runner.stdout.log`.
- Linux 7 observation: `/tmp/pi-synthesis-export-linux7.json`; runner log: `zotero-7-linux-x64-fc73201b/e2e-e0adb33d/diagnostics/runner.stdout.log`.

These are focused behavior runs of a current-source installed add-on. The outer full-matrix receipt remains failed because its default release-family selection expects other Pi cases that the focused entry does not run; the successful test output and export observation are the evidence for this change. The Linux 10 run also predates the canary's host-facts publication. No C20/full-release acceptance is claimed.

Real-host diagnosis repaired the shared test driver's fixture-only Local Network confirmation: it observes native window openings rather than polling Window Mediator. The exact fixture endpoint remains mandatory. Production authorization is unchanged.

Final scoped ESLint, Prettier and `git diff --check` passed. An additional temporary test-only TypeScript configuration reports four existing diagnostics in `diagnosticBridge.ts`, `objectCleanupHarness.ts` and `testObjectKeepFlag.ts`; production TypeScript checks pass, and real-host canaries compile and execute through the existing runner.

Reproduce canary 308 by setting `ZOTERO_PI_SYNTHESIS_TOOLS=1`, a test entry importing `tests/zotero/e2e/full/308-pi-synthesis-tools.zotero.test.ts`, and `ZOTERO_TEST_GREP=Installed Pi Synthesis directory export`, then running the existing compatibility command with `--mode behavior --suite full --domain e2e --build-root .scaffold/pi-synthesis-build` and the appropriate target. The existing wrapper supplies the deterministic provider. Preserve the structural observation and runner log; a focused canary does not satisfy unrelated full-matrix families.
