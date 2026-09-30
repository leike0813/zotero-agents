# C15 verification

- Date: 2026-10-01 (Asia/Shanghai).
- Baseline: `64ea8d1699293820941767f75733fa5ab1048329`.
- Scope: the approved combined Gateway/Broker prerequisites, seven navigation projections, Saved Search discovery and production Conversation wiring. No dependency, service, persistence format, commit or release was added.
- Governance: the user approved expanding #26's catalog-only boundary. [#39's maintainer decision](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5587998361) permits development while the formal release receipt remains deferred. These local test results are not a v0.9.0 release receipt.

## Completeness and correctness

The four delta specs contain eight affected requirements (seven added, one modified) and 21 scenarios, including five retained catalog scenarios. Every requirement maps to existing production owners and behavior tests:

| Requirement | Implementation | Evidence |
| --- | --- | --- |
| Reviewed native catalog | `zoteroNativeToolCatalog.ts` | 250 and real-host 284 verify unique identities, closed schemas and read/mutation composition |
| Seven canonical navigation operations | Native catalog and canonical Broker | 250 dispatches all seven; 188 covers native selection, Reader and cancellation; 286 exercises production continuation |
| Bounded Saved Search discovery | Broker `library.listSavedSearches` projection | 250 forwards library/limit/cursor and returned refs; 284 exercises the real canonical read |
| Foreground admission | `piToolGateway.ts` | 245 rejects Skill Run, automatic, absent/stale sources and stale continuation; ordinary host-control authorization remains required |
| Single-per-batch admission | Gateway batch preflight | 245/250 reject every conflicting navigation individually while retaining independent reads |
| Safe uncertain failure facts | Gateway result projection | 245/250 preserve safe code, retryability and bounded details; 284 retains unknown mutation receipt failure evidence |
| Original Workspace interaction | Router, Sidebar and `piConversation.ts` | 256/260 cover exact source window, multiple windows, document/source/owner changes, away-and-back invalidation and later-turn rebinding |
| Trusted first-effect boundary | `ZoteroNavigationCallControl` and Broker | 188 checks pre-effect expiry/cancellation, cold Reader reservation, loaded Reader revalidation and completed late-cancel dispatch |

192 verifies that navigation transcript updates preserve non-transcript chrome DOM identity. The source authority is transient, outside schemas, Workspace wire DTOs, transcript and receipts. Permission continuation retains the source turn's target; model invocation tools come from the filtered Gateway catalog.

## Coherence

The change follows all six design decisions. Gateway owns admission and scheduling, Conversation owns turn continuity, Workspace owns the source presentation, and Broker owns native UI behavior. Navigation is seven explicit static mappings; no registry import, alternate window resolver, dependency or generic navigation service was introduced. Ordinary read, mutation and approval behavior remains covered by existing suites.

The approved native-host verification found one additional Broker defect: native collection-tree selection finishes before the item tree is loaded. A Publications-to-Library reveal returned no selected items despite a successful row change. Broker now awaits native `waitForLoad()` before item selection; the existing 286 fixture starts in Publications to make the regression independent of suite order. This reuses the canonical native owner and does not retry unknown effects.

## Validation

All host commands use the isolated standard runner and:

```sh
ZOTERO_PLUGIN_ZOTERO_BIN_PATH=/home/joshua/Workspace/Artifact/Zotero-Skills/zotero-hosts/linux-x86_64/9.0.6/Zotero_linux-x86_64/zotero
```

| Command | Result |
| --- | --- |
| `npm run test:node -- --shard runtime-provider-execution` | Passed, 15 files |
| `npm run test:node -- --shard assistant` | Passed, 7 files |
| `npm run test:node -- --shard zotero-host` | Passed after final Broker correction, 16 files |
| `npm run test:zotero:core` | Passed, 164 tests, Zotero 9.0.6 / Linux x86_64 |
| `ZOTERO_TEST_GREP='canonical navigation in Zotero runtime' npm run test:zotero:core:full` | Passed after final Broker correction, 3 tests |
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed, production browser bundle, XPI and all declared TypeScript projects |
| `npm run lint:check` | Passed, serially after build and documentation updates |
| `openspec validate add-pi-zotero-navigation-tools --strict` | Passed |
| `openspec validate <capability> --type spec --strict` for all four affected capabilities | Passed; long-requirement notices are informational |

The three Node shards cover 38 files. The existing 107 SkillRunner-compatible runner also passed (185 tests) after supplying its required host-aliveness fixture. Full Node and the full core-full suite were not run for this change.

TDD evidence: new Gateway and Conversation cases failed before their implementation, the catalog's navigation cases failed before projection, and the owner-away-and-back case failed before synchronous invalidation. The 260 router tests were written after the implementation; no red-phase claim is made for them. Native composition first failed after mutation completion with navigation unknown, then the minimal three-test reproduction passed after waiting for item-tree load. Initial fixture failures (invalid error details, obsolete unknown-code expectation and missing Saved Search libraryId) were corrected. A mistaken navigation grep selected zero tests and is excluded from passing evidence. One lint attempt overlapped help-doc generation during build and failed reading its transiently missing manifest; lint was subsequently run after build.

## Specification sync and archive

The official sync workflow reused the successful `openspec instructions specs --change add-pi-zotero-navigation-tools --json` snapshot. All eight delta requirement blocks match the main specs after whitespace normalization; all 61 untouched baseline requirement blocks remain intact. Added requirements already being present are expected informational notices during post-sync change validation.

Final verification: 9/9 tasks complete; completeness, correctness and coherence verified in the approved scope, with no critical findings or warnings. Official archive inputs were loaded successfully. The specs were synchronized before moving the completed change to `openspec/changes/archive/2026-10-01-add-pi-zotero-navigation-tools/`; no active change remains. `git diff --check` passes. Build-generated manifest timestamp noise was restored to its baseline, and the remaining diff belongs to the approved implementation, tests, specifications and documentation.

## Limits

No unresolved implementation defect remains in the tested scope. Foreground eligibility proves a valid presented source interaction, not OS focus. Native open/location receipts prove the declared native dispatch boundary; unknown effects are not automatically replayed. Windows/macOS, Zotero 7/10 and the complete supported version/OS matrix remain C20 work. Skill Runs, diagnostics and restart reconciliation remain C17/C18/C19 work respectively.
