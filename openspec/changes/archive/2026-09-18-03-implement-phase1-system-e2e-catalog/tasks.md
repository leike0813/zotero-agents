# Tasks

## 1. Enforce the Serial Gate and Fixture Contract

- [x] 1.1 Confirm `02-add-system-e2e-fault-control-and-sidecar-recovery` is implemented, verified, synchronized, and archived before editing implementation files; record the archived change identity in the implementation notes
  - Archived identity: `openspec/changes/archive/2026-09-18-02-add-system-e2e-fault-control-and-sidecar-recovery`; all archived tasks are complete and its `synthesis-sidecar-runtime-supervision` delta is present in the main spec.
- [x] 1.2 Add failing fixture-contract cases for every new synthetic structural fact, then extend the active Committed Seed and verify identity, determinism, reset, and privacy checks pass
- [x] 1.3 Add failing family-lifecycle cases for the declared Phase 1 owned state and carry-over, then wire the family metadata into the existing runner and verify undeclared state still aborts the suite

## 2. Complete Synthesis Lifecycle and Read Families

- [x] 2.1 Add failing `SL-01` and `SL-02` public-lifecycle cases, implement only the required harness setup, and verify shutdown ordering, discovery cleanup, pre-ready failure, owner rollback, and post-family health through real Zotero
- [x] 2.2 Add failing `RH-01` multi-page public refresh evidence, implement the deterministic multi-page seed/setup, and verify one coherent basis and one ready commit without private repository assertions
- [x] 2.3 Add failing `PA-01` and `PA-02` Workbench cases, implement the minimum historical/read-only and malformed-neighbor fixture facts, and verify public readability plus one bounded typed diagnostic while valid neighbors and sidecar health remain available

## 3. Complete Public Maintenance and Citation Graph Families

- [x] 3.1 Add failing `PM-01`, `PM-02`, and `PM-04` cases before harness changes, then verify admission replay has one worker/effect/terminal receipt, pending restart requires explicit continue on the same identity, and running cancellation terminalizes only at the promotion checkpoint
- [x] 3.2 Add failing `CG-01` through the public graph surface, then verify an old continuation/view returns typed `basis_mismatch` with no data or mutation while a fresh view remains readable
- [x] 3.3 Run the complete `SL`, `RH`, `PA`, `PM`, and `CG` families and verify each cleans its namespace and passes the Suite Health Gate before yielding the shared profile

## 4. Complete Host Bridge Canonical Mutation Replay

- [x] 4.1 Add failing `HB-01` using public `notes.create` with deterministic synthetic Unicode, then verify exact replay exposes one canonical settled operation and exactly one note
- [x] 4.2 Add failing `HB-02`, then verify an operation-ID reuse with a different semantic digest returns `idempotency_conflict` without changing the original note or evidence
- [x] 4.3 Add failing `HB-03`, extend the existing runner with one same-profile Zotero relaunch, hold the selected operation once in the test runtime after durable admission, then externally interrupt the exact owner and verify restart exposes canonical `unknown` through `mutation.get_operation` without generic-store takeover or automatic replay
- [x] 4.4 Run the complete `HB` family and verify mutation evidence, note cleanup, process cleanup, and the post-family Suite Health Gate are complete

## 5. Establish the Windows Citation Graph Close Diagnostic Boundary

- [x] 5.1 Adapt the existing close-lifecycle path into one unattended Windows Zotero 10 command that preserves sanitized terminal evidence and the last lifecycle stage; record the result for each tested Zotero 10 version
  - `npm run test:zotero:e2e:cg-02` drives the public Workspace path. Matrix-pinned Zotero 10.0.1 and local Zotero 10.0.2 each completed 30 cycles without a host-process exit; complete manifests are `c61c8827-624c-4be7-ae62-325fc9e166df` and `43c6c34d-d060-44fc-96ce-40aba7f44381`.
- [x] 5.2 Record the observed evidence and tested hypotheses without attributing the defect to Preact, Sigma, sidecar shutdown, or frame teardown in advance
  - The historical `Sigma.kill()` hypothesis was tested as a single variable and did not reproduce the crash in the public 30-cycle Windows run. The hypothesis was rejected, and no speculative owner-level regression or production change was retained.
- [x] 5.3 Defer red reproduction, production-owner diagnosis, owner-level regression, and root-cause repair to a dedicated change after the complete E2E framework is available; retain this command and evidence format as its starting point and keep `CG-02` as a Windows release-promotion prerequisite
- [x] 5.4 Run the same public sequence on Zotero 9 and record `affected`, `unaffected`, or `unverified` from actual evidence; never infer its state from Zotero 10
  - Zotero 9.0.6 / Windows x64: `unaffected` from an actual 30-cycle run; manifest `8c512eb1-b461-4e6a-8192-f7a1db81173a` is complete.
- [x] 5.5 Remove temporary instrumentation, retain only approved sanitized artifacts, and verify `CG-02` is mapped to the Citation Graph owner and Windows release-promotion prerequisite
  - The retained artifact is `synthesis-close-lifecycle.json`; documentation maps `CG-02` to Citation Graph application and the Windows release-promotion prerequisite.

## 6. Verify and Document the Catalog

- [x] 6.1 Run all fifteen original Phase 1 cases serially in one Zotero 10/Linux Committed Seed invocation and verify one copied profile, only declared intra-family carry-over, complete cleanup/health evidence, and a terminal `complete` Run Manifest
- [x] 6.2 Run `CG-02` on Windows Zotero 10 and the Zotero 9 classification run, and verify both manifests retain trustworthy host-terminal evidence without private data
  - Zotero 10.0.1 manifest `c61c8827-624c-4be7-ae62-325fc9e166df`, Zotero 10.0.2 manifest `43c6c34d-d060-44fc-96ce-40aba7f44381`, and Zotero 9.0.6 manifest `8c512eb1-b461-4e6a-8192-f7a1db81173a` are complete and reference only sanitized workspace-relative lifecycle artifacts.
- [x] 6.3 Verify `300-lisongtao-gold` and `npm run test:zotero:e2e:stress` still use their existing locations and commands and are not counted as catalog completion without matching trigger and assertions
- [x] 6.4 Update operator/developer E2E documentation with the implemented public entrypoints, fixture revision, case rerun commands, ownership, and evidence locations; verify documentation links and commands resolve
- [x] 6.5 Run the focused lower-layer tests, `npm run test:zotero:e2e`, strict OpenSpec validation, and repository formatting/type checks relevant to changed files; record any unavailable real-machine evidence as incomplete rather than passing
  - Focused changed-path tests, Zotero 10/Linux E2E, Windows CG-02 runs, strict OpenSpec validation, formatting, ESLint, and TypeScript checks pass. The full `zotero-host` shard still has nine managed-mutation failures that reproduce with the HB-03 checkpoint invocation removed; the unresolved Windows host-exit reproduction and diagnosis are deferred under task 5.3.
