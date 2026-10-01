# C19 verification: harden-pi-lifecycle-and-recovery

Date: 2026-10-01. Baseline: `7efd7044def0f91e3d99805ca1df149fe9845f4d`.
Scope: the accepted [C19 plan and Q205–Q227](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5551723672), implemented in the working tree. No commit or release is part of this change.

## Review result

| Dimension | Result |
| --- | --- |
| Completeness | 13/13 tasks complete, including required acceptance, official review, spec sync, archive and handoff. All 7 delta specs read; 13 ADDED and 1 MODIFIED requirement mapped. |
| Correctness | 14/14 requirements and 17/17 scenarios mapped to implementation and executable behavior evidence below. |
| Coherence | One process lifecycle module, existing Workflow queue, canonical owner facts, existing Broker observation and Workspace regions. No new dependency, database, scheduler framework or Node runtime. |

This is the official project-local `openspec-verify-change` review. The parent performed the final verification; an earlier independent pass did not complete because its service returned HTTP 429. Test results are established by runner output, not by that advisory pass.

## Requirement and scenario evidence

Paths below are relative to the repository. Numeric test identifiers name the checked-in behavior suites.

| Requirement | Implementation | Scenario evidence |
| --- | --- | --- |
| Startup restores reservations before new Skill Runs | `piOwnerPersistence.ts:listPiOwnerInventory`, `piSkillRun.ts:restoreReservations`, `workflowSubmissionQueue.ts:restoreReservation`, hooks startup barrier | `runtime/274` discovers missing registry rows, rejects unreadable inventory and preserves corrupt-owner reservation facts; `workflows/274` rejects untrustworthy reservations, adopts originals without dispatch and blocks only new Pi admission. |
| Process admission reserves foreground capacity | `piRuntimeLifecycle.ts:acquire` | `runtime/275` admits ten background plus two foreground turns, preserves lane fairness and holds capacity for unresolved physical promises. |
| Active budgets survive safe continuation | lifecycle leases, owner `execution_checkpoint`, Runtime/Gateway watchdogs | `runtime/275` uses deterministic monotonic time and refuses exhausted budgets; `runtime/278` restores cumulative budget and Workflow lowering; `runtime/276` validates descriptor timeouts and clips them to the turn deadline; real `core/lite/286` preserves canonical budget across reconstruction. |
| Restart recovery does not replay uncertain work | `piSkillRun.ts:reconcile`, `piConversation.ts:reconcilePiConversationsOnStartup`, persistence assessment | `runtime/278` covers unknown started work, safe running-owner background continuation and explicit continuation after both startup and manual reconciliation; real `286` reconstructs without dispatch and `289` preserves a Broker hold. |
| Shutdown has one absolute cleanup deadline | hooks shutdown, `waitForPiShutdown`, both coordinator shutdown seams | `runtime/275` closes admission and ends concurrent waits without fabricating settlement; `runtime/278` stops both owners together and reports unresolved disposal. `zotero-host/93` verifies test cleanup/reset. |
| Maintenance is serial and hold-safe | lifecycle maintenance, `runtimePersistenceGovernance.ts`, Pi deletion/retention primitives | `runtime/275` prevents overlap and retries after failure; `runtime/274` tests the thirty-day gate, unresolved archived work, claimed apply, physical occupancy, deletion receipts and cleanup retry. Daily maintenance performs cleanup only, as required by Q223. |
| Recovery inventory and checkpoints preserve canonical authority | owner inventory, checkpoints, integrity inspection and rebuildable registry | `runtime/274` discovers canonical-only owners, refuses missing/stale budget evidence, preserves corruption and reconstructs derived facts. |
| Transcript inspection protects committed facts (MODIFIED) | `assessPiOwnerRecovery`, existing torn-tail repair/index rebuild | `runtime/274` repairs a torn tail during assessment and preserves committed corrupt history. Both existing scenarios remain in the delta. |
| Skill Run restoration retains request reservation and budget | `piSkillRun.ts:recoveryContinuation`, `continueRecovery`, `reattachWorkflowApply`, `releaseRestoredSlot` | `runtime/278` resumes the original request only after holds resolve, restores remaining budget and settles terminal apply/ack with or without captured apply inputs. Missing unexecuted apply input and claimed apply retain holds. |
| Conversation recovery and deletion respect process holds | Conversation foreground leases, recovery check, two-phase delete | `runtime/278` verifies foreground admission; `runtime/274` retains a physically occupied Conversation; `runtime/256`, `257` and real `286` cover owner/title/deletion lifecycle. Conversation uses an explicit check followed by a new user prompt. |
| Broker invocation association commits before effects | Gateway trusted preflight, canonical started evidence, persistence observation | `runtime/276` verifies pre-effect binding and original late invocation evidence after cancellation; `runtime/274` handles unavailable, running, observer failure, unknown and repair-required evidence without replay. |
| Physical resource claims outlive logical timeout | Gateway combined executor/physical promises, shared resource claims and bounded teardown | `runtime/276` blocks conflicting effects until settlement, retains unknown claims and staging, and ends stalled teardown on shutdown abort. `runtime/240` retains provider occupancy when cancellation returns or evidence commit fails. |
| Native physical evidence and staging holds survive logical cancellation | `piTrustedNativeExecution.ts`, MCP transport exit evidence, canonical staging holds | `runtime/248`, `276` cover unproved termination and retained staging; `runtime/274` retains actual residue despite a missing cleanup fact. Real core runs native process/cancellation and filesystem suites. |
| Lifecycle evidence respects the shutdown deadline | canonical-first owner writes and `shutdownPiRuntimeAudit` | `runtime/271` stalls audit owner resolution, ends at the common deadline and prevents late directory recreation. Real `289` covers canonical/audit separation and owner deletion. |

Workspace actions remain in existing Details/Reply/permission regions. `assistant/192` and `258` verify recovery controls and preserve non-transcript DOM identity during transcript/loading updates; `260` covers owner-first/page-first publication. No transcript-derived input was added to a chrome render key.

## Executed checks

Each Node row used `npm run test:node -- --shard <name>` and returned exit 0. These are affected shards, not a claim that every repository shard was rerun.

| Shard | Files | Local output |
| --- | --- | --- |
| acp-runtime | 24 | `/tmp/pi-c19-acp-runtime-completion.log` |
| runtime-platform-persistence | 15 | `/tmp/pi-c19-persistence-completion.log` |
| runtime-provider-execution | 18 | `/tmp/pi-c19-execution-final-acceptance.log` |
| workflow-engine | 21 | `/tmp/pi-c19-workflow-final-acceptance.log` |
| skillrunner-runtime | 26 | `/tmp/pi-c19-skillrunner-close.log` |
| assistant | 8 | `/tmp/pi-c19-assistant-close.log` |
| ui | 16 | `/tmp/pi-c19-ui-close.log` |
| zotero-host | 17 | `/tmp/pi-c19-zotero-host-close.log` |

The final startup-resolution correction was checked with:

```text
npx tsx node_modules/mocha/bin/mocha tests/runtime/278-pi-owner-lifecycle-integration.test.ts --require tests/setup/zotero-mock.ts --timeout 10000 --exit
```

Result: 16 passing, including startup/manual unknown reconciliation, safe automatic restart, explicit same-request continuation, budget, reservation, apply/ack, deletion and shutdown. Local output: `/tmp/pi-c19-startup-resolution-green.log`.

| Command | Result |
| --- | --- |
| `npm run lint:check` | Exit 0; full Prettier and ESLint passed. Changed files after the last correction passed focused Prettier/ESLint again. |
| `npm run build` | Exit 0; production browser/XPI build, shared package checks and all four TypeScript configurations passed (`/tmp/pi-c19-build-final-acceptance.log`). |
| `npm run check:pi-mcp-browser-bundle` | Exit 0; MCP entry 2,182,629 bytes, no Node MCP SDK; plugin has no legacy MCP SDK (`/tmp/pi-c19-browser-final-acceptance.log`). |
| `npm run test:zotero:core` | 227 passed on real Linux Zotero (`/tmp/pi-c19-core-final-acceptance.log`). |
| Final-source Pi core smoke (command below) | 209 passed (`/tmp/pi-c19-core-source-final.log`); recorded separately from the complete core run. |
| `npm run test:zotero:ui` | 4 passed (`/tmp/pi-c19-ui-final-acceptance.log`). |
| Filtered restart E2E (command below) | Foundation, ACP restart AC-05 and SkillRunner interrupted apply SR-02 passed; family cleanup and Health Gate passed. |
| `openspec validate harden-pi-lifecycle-and-recovery --strict` | Passed with all 7 deltas, including the explicit-only torn-tail contract correction. |
| `git diff --check` | Passed. |

```shell
ZOTERO_TEST_GREP='Pi|pi |startup' npm run test:zotero:core
ZOTERO_TEST_GREP='runner foundation|AC-05|SR-02' npm run test:zotero:e2e
```

The real host is the installed Linux Zotero 9.0.4. These are controlled runner profiles, not a supported-version matrix certification. E2E used the existing `tests/zotero/e2e/full` runner and its current-source local Synthesis sidecar. The completed manifest is `artifacts/test-diagnostics/system-e2e/b23b8f25-8fab-4789-b70f-d6d3397f1d97/run-manifest.json`; its three family results, cleanup and health all report passed. Ignored run artifacts and temporary logs remain local; no private library fixture was added.

## Failures found and corrected

- TDD reproduced queue barrier loss, budget replenishment, missing terminal ack/slot release, preparation after late settlement, recovery control publication and unresolved shutdown reporting before their fixes.
- The unknown-resolution regression first proved that a halted run could never offer continuation. The safe checkpoint now retains its budget while independent effect/physical holds block continuation. A second red case caught startup directly resolving an originally running unknown owner; recovery status now commits before observation, so a crash after evidence publication cannot authorize automatic continuation.
- The MCP browser gate caught a lifecycle import cycle pulling the owner graph into the transport entry (19,926,228 bytes). Hooks now composes narrow lazy startup callbacks; the existing 3 MiB gate passes without weakening it.
- ACP restart exposed a transient Zotero window in persisted provider options (`NS_ERROR_NOT_AVAILABLE`). The shared Workflow seam now supplies it only to builtin-pi; the existing workflow test covers Pi, ACP and SkillRunner. No provider-specific validation exception remains.
- SkillRunner apply-start lost an already-resolved run when its request ID was still absent. The event retains its run key and the update uses the resolved canonical record. SR-02 now reaches and reconciles the interrupted apply boundary without replay.
- Earlier core smoke had one incorrect test expectation about Conversation recovery eligibility; it was removed while retaining the no-dispatch assertion. The subsequent complete core run passed. An earlier full-core attempt was interrupted while waiting on library queries and is not counted as a passing run.

## Remaining scope and final assessment

No unresolved implementation or scenario finding remains in C19. Unknown/repair-required effects, unproved native termination and unavailable Workflow apply input intentionally retain recovery/cleanup holds; no forced clear or replay was added.

Full Zotero 7/9/10 and Windows/macOS matrix, clean candidate/XPI installation and upgrade, live-account receipts, bundle comparison and performance capacity selection remain C20. The provisional 12/10 ceiling has behavior evidence here, not performance certification. No live credential or full release acceptance claim is made.

Spec synchronization preserves existing main-spec requirements and scenarios, adds the thirteen requirements, and replaces only the torn-tail requirement with its complete two-scenario delta. All fourteen delta requirement blocks were compared against their main specs after merging; all seven main specs passed `openspec validate <capability> --type spec --strict`. The validator's long-requirement notices are informational and do not weaken any behavior contract.

The completed change is archived as `2026-10-01-harden-pi-lifecycle-and-recovery`. `openspec archive harden-pi-lifecycle-and-recovery --skip-specs --yes --json` moved the verified change after the agent-driven sync; `specsUpdated: false` in its receipt means the CLI did not apply the already-synchronized deltas a second time. Tasks are 13/13 and the Pi handoff now points to C20.
