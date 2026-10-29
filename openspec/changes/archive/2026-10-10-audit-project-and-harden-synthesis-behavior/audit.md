# Audit evidence

Baseline: `e48b21245c2cf183dbb07021108ecc075e31b3ae`, 2026-10-09. Existing staged `addon/content/help-docs/manifest.json` is user-owned and preserved.

## Baseline executions

| Command | Result |
| --- | --- |
| `npm run build:synthesis-rust-sidecar` | Passed |
| `npm run test:synthesis-rust-sidecar` | 427 passed, 0 failed, 0 ignored |
| `npm run test:synthesis-native:stage1` | 37 test files; all three segments passed |
| `npm run test:node:synthesis` | 35 test files; all three shards passed |
| `npm run check:synthesis-cross-language-contracts` | Passed; 135 protocol capabilities, 15 worker operations |
| `npm run check:synthesis-native-runtime-contract-parity` | 19 cases passed |
| `npm run check:synthesis-native-worker-transfer-parity` | Passed |

## Confirmed findings

### A-01: Malformed RPC envelopes are misclassified

- Owner: `src/modules/synthesis/sidecar/synthesisSidecarRpcClient.ts`, decoded response handling.
- Trigger: HTTP 200 containing `null`, `[]`, `{}`, or `{"ok":"true"}`.
- Actual: `null` becomes `service_unavailable`; the other values become `internal_error` under the production transport policy.
- Expected: `response_invalid`, without invoking the result projection. Default compute callers use `worker_result_invalid` for the same boundary.
- Evidence: an inline Node/tsx script called the real shared client with a synthetic fetch response and `assert.rejects(..., {code: 'response_invalid'})`; all four assertions failed before edits.
- Cause: parsed JSON is type-asserted but not validated before property access and native-error classification.
- Scope: production composition, transfer, compute, Workbench and reverse-Host transfer consumers all share this client.
- Status: fixed in the shared client. Test 231 first failed with `worker_unavailable` instead of `worker_result_invalid`; after the fix, its 17 tests pass, including malformed envelopes under both error policies, HTTP contradictions, valid native errors, success identity, null data, cancellation, timeout and disconnection. Root `tsc --noEmit` passes.

### A-02: Runtime deadline documentation has drifted

- Owner: `docs/synthesis-layer/sidecar-runtime-supervision.md`, reverse-Host reads.
- Document says library reads have a ten-second deadline. `runtime_reverse_host.rs` gives `library.*` a 30-minute maximum bounded by the active operation deadline, with separate export and ordinary-call defaults.
- Existing Rust timeout-selection and real-route slow-reference tests support the implemented behavior.
- Status: corrected to operation-bounded library, export and ordinary-call deadlines.

## Additional confirmed defects

| ID | Owner / trigger | Observed failure and repair boundary | Regression |
| --- | --- | --- | --- |
| A-03 | Rust canonical numbers and worker frame/page serialization | Valid `0.000001` transfer returned `transfer_conflict`; `1.0` and exponent thresholds also differed. Default float parsing rounded a boundary input incorrectly. Use precise parsing and one canonical representation for control, input and output pages. | Protocol numeric/hash cases and real numeric transfer 239; red observed before repair. |
| A-04 | TypeScript JSON normalization | `__proto__` vocabulary alias disappeared on load/save. Preserve own JSON data properties without mutating prototypes. | JSON roundtrip 239 and real save/load/reopen; red → green. |
| A-05 | Library Index closed request DTO | Native partition cursors were returned but forbidden in public requests. Expose the existing optional partition cursors. | Real nonempty partition continuation 238. |
| A-06 | Library Index scope projection | Empty library 7 reported 1; collection rows also reported 1. Use launch-bound application library ID. | Empty/populated library 7 assertions in 238. |
| A-07 | reverse-Host page read | Revision changing during final awaited read published mixed data as the old snapshot. Recheck basis before publication. | In-flight final-page mutation and stable control in 225; red → green. |
| A-08 | ACP adapter permission lifecycle | A peer exiting with code 23 during unanswered permission left prompt and connection unresolved. Observe transport termination independently to release permissions while draining final messages. | Real ACP peer exit regression in 100. |
| A-09 | SkillRunner release installer | Partial same-version extraction changed OLD bytes to NEW despite failed install. Extract/validate in sibling staging, promote with backup, restore without overwriting a concurrent target. | Partial extraction, artifact validation, promotion/restore failure, successful replacement in 75; red → green. |
| A-10 | SkillRunner temporary artifact retention | Early extraction failure removed temp files despite `keepTempOnFailure: true`. Select retention by final outcome for all return paths. | Early failure and flag combinations in 75; red → green. |
| A-11 | Library Index nonempty Topic projection | Serializing TopicRecord directly emits camelCase application fields instead of the closed snake_case Index row, so any populated Topic partition fails public validation. Project the public row explicitly, retaining domain status and independent pagination. | Nonempty Topic partition in 238; schema failure reproduced before repair. |
| A-12 | Tag audit result enum fields | Ready/acknowledged/conflicted variants emit snake_case fields while public schemas require camelCase. Correct serialization at the application owner and retain aliases for reading old durable conflict receipts. | Real traversal, ready → acknowledgement → replay/reopen, and Host-drift conflict in 239 Tag audit; 4 passed after red reproduction. |
| A-13 | Topic Graph default provenance | A rationale without explicit provenance becomes `{rationale: ...}`, which violates public EvidenceRecord and makes the resulting graph unreadable. Use `quote_or_summary`. | Valid Topic apply, public graph read, decisions and reopen in 239 Topic mutations; 3 passed, including explicit string provenance. |
| A-14 | Library Index Topic collection | The native collector reads only the first 100 Topic records, so continuation silently loses later rows. Consume domain pages within the existing 25,000 collection limit. Preserve lifecycle status from canonical definitions/graph instead of using the last synthesis operation as status. | 238: 102 Topics return 100 then 2 with total 102; archived/deleted/ordinary cases; 9 tests passed. |
| A-15 | Library Index planned Topic inventory | Reading only materialized application records drops graph-only planned Topics that the historical inventory included. Merge graph-only nodes without invented artifact fields, deduplicate materialized nodes, filter deleted nodes and sort the combined bounded inventory by Topic ID. | 238: a materialized Topic and two planned graph-only Topics paginate in stable order; red observed as 1 returned instead of 3. |

The numeric repair initially exposed a storage compatibility risk during independent review: globally changing canonical numeric bytes invalidates old Topic manifests. The implementation preserves canonical-store v1 formatting separately from the corrected wire formatting using the same traversal. Frozen old bytes/hashes now pass reopen, bounded/ordinary reads, export/import and promotion; tampering remains rejected. An independent 108,802-number probe matched JavaScript canonical text, byte lengths and hashes. This is compatibility evidence, not an exhaustive proof for every IEEE-754 value.

Independent parent reproductions of A-08/A-09/A-10 used `/tmp/zotero-audit-e48b2124-acp.mts` and `/tmp/zotero-audit-e48b2124-installer.mts`; output confirmed exited transport with unsettled prompt, changed previous install bytes, and missing requested diagnostics.

## Initial implementation verification (2026-10-10)

| Command / scope | Result |
| --- | --- |
| Full `test:node`, shared uv environment, followed by the two failed shard reruns | All 28 ordinary shards pass across the run and reruns. Two initial shards could not resolve the installer while it was being edited; stable-source reruns pass. |
| `test:synthesis-rust-sidecar` | Final source: 431 passed; zero failed/ignored, including old-storage numeric regressions and Related Items lost-response recovery |
| `test:synthesis-native:stage1` | 42 files; all three segments pass. Final graph-only inventory addition followed by targeted callers and CI group below |
| Seven-file production route CI command (231/237/238 Index/239 JSON/239 numeric/239 Topic/239 Tag) | 42 tests pass on Linux, including all 10 Index regressions |
| Final Index caller regressions (229/230) | 31 tests pass, including production-operation matrix, Topic planning and Workbench projections |
| Cross-language registry, runtime contract parity, worker transfer parity, Rust license inventory | Pass; 135 capabilities, 15 workers, 71 licensed packages |
| Root and Synthesis/Dashboard/Sidebar TypeScript checks | Pass |
| Changed production/helper/test ESLint; Rust Clippy with warnings denied; Rust format; targeted Prettier | Pass |
| OpenSpec strict validation | Pass |
| Linux Zotero 10.0.5 supplementary System E2E | 31 selected/passed; manifest `89557806-9114-4711-be95-57a289df9ff4` complete; all 30 family receipts, cleanup and health passed |
| Linux Zotero 7.0.32 System E2E | 31 selected/passed; manifest `b75c9a4b-5791-497d-a141-cd4074bdd827` complete; all 30 family receipts, cleanup and health passed |
| Linux Zotero 9.0.6 System E2E | 31 selected/passed; manifest `847d112b-84a2-43dc-a2a0-fef812fd7359` complete; all 30 family receipts, cleanup and health passed |
| Final-source Linux 7.0.32 RH selection | 4/4 passed; complete manifest `3d068374-1d5e-4b56-a5d6-ed0175060ced`; cleanup and health passed |
| Final-source Linux 9.0.6 RH selection | 4/4 passed; complete manifest `778d6bb8-1100-4add-a2b3-8c2726507482`; cleanup and health passed |
| Final-source Linux Zotero 10.0.2 System E2E | Isolated verified host: 31/31 passed, zero failed/skipped/incomplete; manifest `e6a84c22-53c2-48c3-911b-83425070a508` complete and reports 10.0.2; all 30 family receipts, cleanup and health passed |

The 7/9 full runs include the new RH-01 partition continuation assertions; they precede the last Tag/Topic and Index semantic changes. Final-source RH reruns pass on both versions, and exact 10.0.2 passes the full suite on final source. System E2E builds the plugin and local sidecar without regenerating the user-owned help manifest. Windows/macOS jobs include the seven real-process test files, but were not executed locally.

Acceptance detected a host-binary provenance issue: the external directory named `10.0.2` actually contains 10.0.5 (`application.ini` and both preliminary/final E2E manifests agree). Those runs are supplementary 10.0.5 evidence, not 10.0.2 evidence. The original 10.0.2 archive matches documented SHA-256 `5f7ed486bf2daac703b905500dd8236b5b6982f7759f0699610ac926764b2a90`; an isolated extraction reports 10.0.2 / BuildID `20260909184950` and is used for the exact-version rerun. The existing external installation was preserved. `docs/dev/zotero-host-binaries.md` now requires version checks before and after acceptance.

Independent review covered the nonnumeric diff and the Tag/Topic fixes. It identified a Windows-only installer fixture filename mismatch and a leftover diagnostic test entering the ordinary shard; both were corrected. Numeric/storage review was separate. No Git commit, publication or archival is part of this change.

Additional recovery coverage: `related_items::tests::lost_response_retry_reuses_the_same_effect_identity_without_duplicating_the_host_effect` executes a stateful Host double's write before dropping its response, then retries with a new application instance over the same repository. It checks one actual creation, stable effect identity, recovered ownership and protection of preexisting relations. All five related-items tests pass. This is application-level fault injection, not a real Host or disk-restart test.

At this checkpoint the confirmed repairs passed, while task 3.3 still required the additional assertions documented below. The later acceptance record supersedes these initial suite counts.

## Remaining-assertion follow-up (2026-10-10)

The user authorized completing task 3.3. The new nonempty and failure-path assertions exposed additional defects; their repairs preserve the existing public schemas.

| ID | Owner / trigger | Failure and repair | Regression |
| --- | --- | --- | --- |
| A-16 | `src/synthesis/synthesisWorkbenchApp.ts`, old library response after owner switch | A higher request ID let an old library replace current Index content and advance the shared watermark. Reject a different library before admitting the response or touching surface state. | 252: visible and hidden old-owner responses; current-owner lower request ID still updates. Red observed before repair. |
| A-17 | `runtime_production_ports.rs`, nonempty Concept/Topic Graph worker input | Repository row fields do not match the existing worker DTOs; nonempty rebuild fails. Project only domain worker fields. Concept query must receive domain rows from one application-owned repository snapshot, since the stored search index does not contain those rows. | Adapter/kernel assertions and 239 Topic public rebuild/query readback; final integrated evidence recorded below. |
| A-18 | `synthesis-application/src/topic.rs`, digest/audit/full context and report | Response fields differ from the closed public schemas, so typed reads fail. Project existing Topic facts into the required context/report fields; use portable relative artifact paths. Independent review also found fabricated triage placeholders that lost real relevance/core-digest facts and could make updates skip untriaged papers. Project stored `source_papers[].triage`, omit absent/empty triage, and keep the semantic view within its closed schema. | 239 Topic four-view/report typed read; real, absent and empty triage fixtures. Both failures observed before repair; ten Topic cases pass after the final build. |
| A-19 | `synthesis-application/src/webdav_sync.rs`, unbased conflict | Empty optional hashes violate the public digest pattern and make conflict observation/resolution unreadable. Omit missing hashes, preserving real hashes and deserialization defaults. | Six typed-client conflict/import/retry/tamper cases; two conflict chains red before repair. A shared-baseline `both_changed` case separately checks all three real hashes and both branches. Rust roundtrip covers absent and real hashes. |
| A-20 | `synthesis-application/src/reference_application.rs`, partial decision batch | Summary diagnostic omits required severity, causing typed clients to reject partial-success receipts. Add `severity:error` at the owner. | 239 Reference mixed batch: two valid decisions retain their facts while a missing proposal fails. Red before repair. |
| A-21 | `reference_application.rs`, Reference index with details | The detail branch serializes repository records directly, leaking storage fields instead of public Reference instances. Reuse the existing shared index-row projection. | Typed `getReferenceSidecarIndex` with `includeReferences:true`, reference identity and accepted/revoked binding readback in 239 Reference. Red → green. |
| A-22 | `runtime_reference_citation_surface.rs`, manual review target | Enum variant fields decode snake_case while the public request supplies `libraryId`/`itemKey` or `canonicalReferenceId`. Apply camelCase to the variant fields without changing discriminators. | Typed manual retarget changes the exact binding from BBB to AAA, supersedes the original proposal and creates one accepted audit; native decoding checks both target kinds. Red → green. |
| A-23 | `runtime_production_ports.rs`, Tag validation | The adapter discards the worker's validation result and returns the original candidate, hiding every rule warning. Project the existing warning DTO into repository warning records using the established stable identity. | Three real rule violations retain code/tag/severity in public validation and saved snapshot; validation leaves the saved state unchanged. 239 Tag passes 12 cases after repair. |
| A-24 | Concept application and native review adapter, stored alias audits | Public keep/remove actions exist in contracts and UI but native decoding and execution omit them. Decode the existing actions, keep the stored audit target private, validate its current identity/owner, and atomically retain or remove the exact alias while synchronizing the owner's concept/senses. | Application table verifies keep/remove, unrelated owners, malformed/missing/mismatched targets, closed replay and reopen. Native route verifies both valid actions; historical review projection remains within the closed public schema. Independent review caught and repaired the missing-target guard. |

The follow-up adds maintenance persistence-failure, pending-cancel and exactly-once terminal assertions without changing its production lifecycle. Runtime assertions count spawn-failure and timeout terminals and reject a second terminal from late completion. Two real-process cases count canceled and failed terminals after repeated control and process drain; pending cancellation performs no Reference/Host effects. Tags has twelve real-route cases, and its stateful application test proves one Host write after a lost response and recovery. Read projections have seven real-route cases covering healthy/bad neighbors, redaction, pagination, read-only behavior and large-result transfer.

The Related Items route now checks one-time echo consumption per target, exact graph edges surviving a malformed Host receipt, the failed sync diagnostic and durable `pending_external_write` intent after reopen. Canonical and Discovery assertions check real decisions and reopened facts; Concept alias actions check both successful native dispatch and malformed/missing/stale target rejection.

Two test infrastructure failures were corrected before acceptance: the global Rust diagnostic capture let parallel tests consume one another's events, so capture and explicit test configuration are now thread-local under `cfg(test)`; the Host-failure fixture initially rejected the startup `webdav.describe` probe, so it now permits that probe and injects failure only into maintenance work. Neither failure is counted as a product defect. The final Rust workspace and 82-case process group pass after these corrections.

Verification scope correction: `tests/tsconfig.json` inherits the root `include` list and does not include test files. Its success is root production typing evidence only, not test-source typing evidence. Tests are directly executed and linted; page code is separately checked with `tsconfig.synthesis.json`.

An initial PA attempt was stopped before host execution while correcting its test helper; a later attempt (`d0770753-54f1-43be-b29a-ad6d99517501`) failed at native linking with undefined hidden symbols and never started Zotero. Final builds use `CARGO_INCREMENTAL=0` after source writers settle, without deleting caches or changing dependencies. These incomplete attempts are not passing E2E evidence.

## Final follow-up verification (2026-10-10)

| Command / scope | Result and evidence |
| --- | --- |
| `CARGO_INCREMENTAL=0 cargo test --workspace --locked --no-fail-fast` in `rust/synthesis-sidecar` | 445 passed, zero failed/ignored; 33 test-result summaries. `/tmp/zotero-audit-rust-final5.log`. Includes final alias target guards, Discovery/Canonical durable facts and exactly-once maintenance terminals. |
| CI production-route command from `.github/workflows/verify-synthesis-sidecar.yml` (231/237/238 Index/239 glob) | 82 passed, natural exit without `--exit`; `/tmp/zotero-audit-ci-final6.log`. Includes the two corrected maintenance process tests. |
| `npm run test:synthesis-native:stage1` | All 46 files pass in three segments: 17 client/contract, 2 packaging, 27 production/recovery; `/tmp/zotero-audit-stage1-final7.log`. This final full run supersedes the old-fixture failure in final5. A direct internal `--shard` selection was rejected by the runner and performed no tests; the supported complete suite command was used. |
| `npm run test:node:synthesis` | 35 files in three shards pass; `/tmp/zotero-audit-node-synthesis-followup.log`. Full-project 28-shard evidence remains the earlier run plus two reruns, not a new single clean run. |
| UI 125/252/256/258/259 | 173 passed; `/tmp/zotero-audit-ui-extra.log`. |
| 229 Related Items targeted case | Passed with final echo, Host-failure and reopen assertions; `/tmp/zotero-audit-related-final3.log`. |
| Cross-language contracts; native runtime contract parity; worker transfer parity | Passed; 135 capabilities, 15 workers; all report empty errors. `/tmp/zotero-audit-contracts-final5.log`, `/tmp/zotero-audit-parity-final5.log`, `/tmp/zotero-audit-worker-parity-final5.log`. |
| Root and Synthesis TypeScript checks; changed TS ESLint; targeted Prettier | Passed. Test sources execute directly; root typing does not include them. Dashboard/Sidebar typing passed at the initial checkpoint and those sources are unchanged. |
| `CARGO_INCREMENTAL=0 cargo clippy --workspace --all-targets --locked -- -D warnings`; `cargo fmt --all --check` | Passed. Formatting-only import/wrapping corrections followed the workspace run. |
| Current-source sidecar and plugin build | Passed, including each System E2E restart's local sidecar build. |
| Linux 7.0.32 new PA assertions | 4/4; complete manifest `71ea300c-2dc3-4cfa-87a4-0da35f947e59`; cleanup and health passed. |
| Linux 9.0.6 new PA assertions | 4/4; complete manifest `517892ba-4a9b-478e-ace8-56953798e6ff`; cleanup and health passed. |
| Linux 10.0.2 new PA assertions, then triage repair | Both 4/4; complete manifests `fbeee26c-1912-48c5-a884-870fb4f8e845` and `e621d4c2-7399-44c7-bbe8-98433e371b8b`; cleanup and health passed. |
| Final Linux 10.0.2 `npm run test:zotero:e2e` | 31/31, zero failed/skipped/incomplete; manifest `abbceb30-2b8e-4f19-906e-e36b4622693d` complete, 30 family receipts with cleanup/health passed; `/tmp/zotero-audit-e2e-10-final5.log`. The run used the verified isolated 10.0.2 host and current-source sidecar; only formatting changed during its restart builds. |
| OpenSpec strict validation | Passed after moving the long domain requirement's detail into its existing scenario-level assertions; five delta specs, nine requirements, 25 scenarios. |

Manifests live under `artifacts/test-diagnostics/system-e2e/<runId>/run-manifest.json`. Linux 7/9 full runs and later RH/PA selections are separate evidence at their recorded source stages; the final full run is on exact 10.0.2. Windows/macOS real-process CI commands include the new 239 files through the shared glob, but neither platform was run in this local acceptance. No source profile or original external installation was modified.

## Audit limits

- Error response identity bypass is not independently classified as a bug: the native error helper currently returns `unknown` IDs. Unconditionally applying successful-response identity validation would break valid failures.
- Native suite membership is duplicated between inclusion and exclusion. The approved refactor removes this drift risk; current rosters agree, so this is not a demonstrated omitted test.
- Maintenance restart/cancel already have TS-driven real native process tests and System E2E coverage. Missing duplicate Rust-layer tests alone is not a behavior gap.
- `300-lisongtao-gold.zotero.test.ts` is a 141-line Index smoke case, not the 5,366-line native route suite; the latter is test 229. Test-layer claims must follow actual files and participants.
- This is a bounded audit of the current baseline, with deeper inspection of Synthesis cross-language/domain boundaries, ACP termination and SkillRunner installation. Full-project Node execution broadens regression evidence but does not prove every module bug-free. The operation inventory and identified behavior gaps are reconciled individually; neither their counts nor passing suite totals prove exhaustive behavior or branch coverage.
