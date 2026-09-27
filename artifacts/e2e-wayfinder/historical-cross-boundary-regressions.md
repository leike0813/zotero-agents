# Historical cross-boundary regressions — research for Wayfinder #43

> Wayfinder research ticket: leike0813/zotero-agents#43
> Parent map: leike0813/zotero-agents#41 ("Wayfinder: Define the Project-wide System E2E Test Strategy")
> Branch: `research/e2e-historical-regressions`
> Scope: Synthesis sidecar ↔ host, Host Bridge, ACP, SkillRunner
> Evidence policy: primary sources only (repository source/docs/tests, git history, GitHub issues/PRs/commits, OpenSpec change proposals and tasks)
> Date: 2026-09-16

## Conclusion

Cross-boundary regressions in this codebase cluster around five recurring
seam-level invariants: (1) protocol-strict sidecar request/response shape
mismatches at the reverse-host boundary; (2) capability / discovery handshake
publication before the underlying owner is actually ready; (3) lifecycle
terminal-state divergence between run stores, transport layers, and UI
projections; (4) provenance-preserving cross-process data classification
(canonical vs. legacy, current vs. historical, distinct-vs-raw counts);
(5) typed JSON / UTF-8 transport decoding across Host Bridge, MCP, and the
sidecar loopback. The current test inventory proves every regression's
*local* symptom in unit / process-internal Node tests, but no production
fixture proves the same path through a real Zotero process plus the
current-source real Synthesis sidecar. That gap is exactly the System
End-to-End Test coverage that issue #41 requires.

This report indexes the historical examples that should seed Phase 1
(Synthesis sidecar ↔ host + one Host Bridge canonical-mutation replay) and
Phase 2 (ACP + SkillRunner) of the System E2E scenario catalog.

Confidence: high for the inventory and the seam categorization; medium for
the candidate scenario phrasing, which the OpenSpec handoff (issue #55) is
expected to refine.

## How the evidence was gathered

1. `git log --all --grep=...` sweep across `regression|flaky|sidecar|host
   bridge|acp|skillrunner|recovery|abort|transcript|chat|websocket|socket|
   lifecycle|shutdown|orphan|pathId|hash|createdAt|source-exact|windows`
   — this is the universe of fix-style commits referenced below.
2. Direct read of every fix commit's diff for the changed module plus its
   accompanying test, where one was added in the same commit.
3. Read of the corresponding OpenSpec change `proposal.md` and `tasks.md`
   in `openspec/changes/archive/...`, because the Why / What Changes /
   Impact sections name the crossed seam explicitly.
4. Read of the current test layout under `tests/synthesis/`, `tests/acp/`,
   `tests/host-bridge/`, `tests/skillrunner/`, `tests/zotero/`, and
   `tests/zotero/e2e/` to map every regression to its *current* coverage.
5. Read of GitHub issues `#1`-`#55` for the four Wayfinder parent issues
   (#41) and their sub-issues (#42–#55) plus the open user reports #8, #9,
   and #38 (Zotero 10 install / workflow package install failures), which
   are themselves cross-boundary symptoms that no current test owns.

## Finding index

### A. Synthesis sidecar ↔ host

#### A1. Sidecar lifecycle regression: historical topic path rewriting and metadata-hash compatibility

- Trigger: code change to `synthesis-canonical-store`'s historical topic
  recognition (rename of `is_current_topic_path_id` →
  `has_current_topic_path_shape`) plus a tightening of
  `validate_declared_hashes` so `metadata_hash` must equal the canonical
  hash of the metadata JSON.
- Crossed seam: Rust canonical store ↔ TypeScript host projection
  (legacy `topics/<topicId>` directories whose metadata contained the
  legacy `metadata_hash` field no longer matched `hash_json(&metadata)`).
- Missed invariant: a legacy Topic whose `metadata.data.metadata_hash`
  was already the canonical hash of its own data must remain readable
  through the same `read_topic` view.
- Current coverage: focused unit test added in
  `synthesis-canonical-store/src/lib.rs`
  (`historical_ascii_topic_id_with_sha256_suffix_remains_readable`) and
  the lifecycle integration test
  `historical_unicode_topic_path_does_not_block_native_startup` in
  `rust/synthesis-sidecar/crates/synthesis-sidecar/tests/native_process_lifecycle.rs`.
  Both prove the in-process Rust path; neither proves that the
  TypeScript host (workbench / dashboard / library adapter) consumes the
  historical-shape response without dropping the legacy artifact or
  rewriting metadata on read.
- Primary sources: commits `5e51b806` and `45ca3ce8` (Sept 12–13, 2026);
  see also the proposal archived under
  `openspec/changes/archive/2026-09-02-fix-synthesis-topic-path-algorithm-parity/`.
- Candidate System E2E scenario: `synthesis-sidecar-historical-topic-read`
  — install the XPI, hand-author a legacy `topics/<topicId>/current/`
  with an embedded legacy `metadata_hash`, start Zotero, open the
  Synthesis Workbench, and assert (a) the legacy topic appears in the
  Index, (b) `read_topic` returns the historical path_id, (c) opening
  the topic Report does not write or rewrite any metadata file, and
  (d) the Topic Graph contains the historical node.

#### A2. Sidecar unavailable recovery: listener saturation drops in-flight Workbench refreshes

- Trigger: `runtime_server_loop.rs::SidecarTransport::poll` accepted every
  loopback connection unconditionally until the sixteen-handler lease
  table was full, then immediately responded `503 service_unavailable`
  instead of applying listener-level backpressure; concurrently, the
  production owner treated `service_not_ready` as fatal rather than
  engaging the existing single-flight generation recovery.
- Crossed seam: native HTTP listener ↔ Workbench chrome refresh
  scheduler (the listener's loopback admission rejection collided with
  the Workbench refresh coalescing policy).
- Missed invariant: the sidecar's per-loopback admission must remain
  bounded without inventing operation-independent failures, and a
  one-off post-ready exit must be recovered by the production owner's
  shared single-flight path.
- Current coverage: targeted Rust integration test
  `saturated_listener_leaves_next_connection_in_backlog` in
  `runtime_server_loop.rs`, plus
  `test/core/228-synthesis-production-runtime-supervisor.test.ts`
  and `test/core/231-synthesis-sidecar-debug-observability.test.ts`.
  None of these cover a real Zotero process issuing repeated Workbench
  refreshes faster than the production owner can drain them.
- Primary sources: commit `e5cc05da` (Sept 4, 2026); OpenSpec proposal
  `2026-09-04-fix-synthesis-sidecar-unavailable-recovery/proposal.md`.
- Candidate System E2E scenario:
  `synthesis-workbench-refresh-saturated-loopback`
  — drive the Workbench Chrome read while the sidecar listener is held
  at exactly `MAX_ACTIVE_HTTP_CONNECTIONS`, then release one lease and
  verify the queued refresh resolves with the latest surface state and
  no operation appears as terminal `service_unavailable`.

#### A3. Sidecar contract version drift between Rust runtime and TS contracts

- Trigger: the Rust lifecycle test pinned
  `schema_version: "synthesis-repository-foundation.v4"` while the TS
  constant `SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION` advanced to
  `v5`, so the production owner and the sidecar silently disagreed
  about schema generation.
- Crossed seam: Rust schema constant ↔
  `packages/synthesis-contracts/src/schemaVersion.ts`.
- Missed invariant: the Rust and TS constants must come from one
  source-of-truth constant exposed by `synthesis-repository` /
  `synthesis-contracts` and asserted in lifecycle tests.
- Current coverage: the lifecycle test now imports
  `synthesis_repository::SCHEMA_VERSION` and the cross-language corpus
  is updated; however the assertion is in the Rust test only and is not
  mirrored from a real Zotero runtime.
- Primary sources: commit `ae9cc160` (Sept 10, 2026).
- Candidate System E2E scenario:
  `synthesis-sidecar-schema-version-consistency` — launch the XPI,
  start the sidecar, and assert that the negotiated `protocol_version`
  and `schema_version` reported by the runtime match the values
  declared by the loaded `synthesis-contracts` package version.

#### A4. Sidecar capability-state workbench: local UI state projected into strict sidecar request

- Trigger: the Workbench capability request was being constructed from
  the complete local `SynthesisUiState` model, which the strict sidecar
  request validator rejected with
  `Synthesis protocol capability request is invalid`; the surface
  result then failed to satisfy the per-surface closed union.
- Crossed seam: TypeScript `synthesisClient` adapter ↔ Rust
  `synthesis-sidecar` request contract.
- Missed invariant: local UI model must be projected into the narrow
  protocol-owned `WorkbenchState` DTO before dispatch and every surface
  result must validate against the request that selected it.
- Current coverage:
  `tests/synthesis/220-synthesis-native-client-composition.test.ts`
  plus the contract corpus in
  `packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/`
  prove the contract mapping. They do not prove that a real Zotero
  session driving the Workbench surfaces (Home, Topics, Graph,
  Review, Cleanup, Operations, Index) can open Chrome and every
  supported surface with a corrupted local UI state.
- Primary sources: commit archive
  `openspec/changes/archive/2026-08-27-fix-synthesis-workbench-capability-state/proposal.md`.
- Candidate System E2E scenario:
  `synthesis-workbench-surface-capability-validation` — start Zotero,
  corrupt the persisted local UI state for one Workbench surface,
  open the Workbench, and assert the Chrome and that surface open,
  unprojected surfaces are rejected at dispatch, and wrong-surface
  results are not silently accepted.

#### A5. Reference refresh per-page strict timeout

- Trigger: the production reverse-host deadline on a per-page reference
  refresh was set equal to the global response timeout, so legitimate
  large pages were aborted; the citation-graph crash journal was being
  invoked from the host frame `beforeunload` instead of the workbench
  tab cleanup path, double-recording the same phase.
- Crossed seam: Synthesis reverse-host broker ↔ workbench tab cleanup.
- Missed invariant: per-page refresh deadline must remain capable of
  extended real-Zotero network latency; crash journal phases must be
  recorded exactly once per teardown.
- Current coverage:
  `tests/synthesis/222-synthesis-reverse-host-broker.test.ts` and the
  companion `native-route` test added in commit `16f77d79`; the
  Zotero-runtime close test `276-dashboard-synthesis-close.zotero.test.ts`
  exercises the workbench close path but not under a saturated
  reference refresh.
- Primary sources: commit `16f77d79` (Sept 16, 2026).
- Candidate System E2E scenario:
  `synthesis-reference-refresh-strict-deadline` — open the Workbench
  on a deterministic gold library, trigger a reference refresh whose
  per-page payload exceeds the historic global timeout, and assert
  the page still completes and the citation-graph crash journal
  records exactly one cleanup phase.

#### A6. Citation repair and oversized broker payload boundary

- Trigger: parent-set verification enrichment of Citation detail pushed
  the response past the Broker's 1 MiB limit, so the migration could
  fail after a successful native commit; simultaneously, legacy
  Citations left behind by a previous accepted-damaged migration were
  unreadable on a fresh scan.
- Crossed seam: Broker note-detail ↔ `literatureArtifactMigration`
  apply path.
- Missed invariant: the Broker's response budget must be enforced at
  the projection boundary, not silently inside the verification
  enrichment; legacy Citations up to 4 MiB must be readable by the
  migration reader while ordinary Broker reads keep their 1 MiB cap.
- Current coverage: the migration Region test
  `tests/ui/264-literature-migration-region.test.ts` plus the
  `literatureArtifactMigration` private converter tests cover the
  repair path. The
  `tests/zotero/core/lite/275-managed-note-transaction.zotero.test.ts`
  proves the managed-note transaction tail. There is no E2E coverage
  that a real Zotero note payload at the 1 MiB / 4 MiB boundary round
  trips through Broker → migration → sidecar and lands in the
  Workbench Index.
- Primary sources: commit `c82055b0` (Sept 14, 2026); OpenSpec archive
  `2026-09-14-fix-accepted-damaged-citation-migration/`.
- Candidate System E2E scenario:
  `literature-migration-oversized-citation-round-trip` — install the
  XPI, seed one Zotero note with a 3 MiB Citation payload, run the
  Dashboard migration apply, and assert the canonical References are
  repaired, the legacy Citation is rewritten under the bounded read,
  and the Index surface shows the migrated artifact.

#### A7. Index / reader / migration regressions on real-device libraries

- Trigger: oversized Zotero note aborted the entire Index read; mixed
  legacy literature notes were classified as unsupported; the first
  Topic Report render lost its Markdown body during an unrelated
  Preact refresh; the literature migration misclassified
  `literature-matching-metadata-json` and lacked scan progress,
  whole-result filtering, candidate detail, remediation, and explicit
  approval/skip controls.
- Crossed seam: Synthesis host-artifact read port ↔
  `literatureArtifactMigration` ↔ Workbench Topic Report Markdown
  island.
- Missed invariant: a resource-limited child note must produce a
  bounded per-artifact diagnostic rather than failing the page; the
  Topic Report Markdown body and its scroll container must survive
  unrelated Reader refreshes; migration candidates must be presented
  as bounded, explicit selections.
- Current coverage: `tests/zotero/core/lite/275-managed-note-transaction.zotero.test.ts`
  (lite), `tests/ui/264-literature-migration-region.test.ts` (Node
  + browser proxy), and the Preact-graph stability tests in
  `tests/synthesis/256-synthesis-graph-region.test.ts`. None of these
  is a System E2E scenario in a real Zotero with a deterministic gold
  library.
- Primary sources: commits `05db418d` (Sept 11, 2026), `0f9d4c0d`
  (Sept 11, 2026), `72c74dca` (Sept 13, 2026); OpenSpec archives
  `2026-09-11-fix-synthesis-index-migration-reader-regressions/` and
  `2026-09-13-fix-migration-and-topic-review-workflows/`.
- Candidate System E2E scenario:
  `synthesis-index-real-device-resilience` — open the Workbench on a
  deterministic gold library with one oversized note and one legacy
  mixed note; assert Index opens, Topic Report Markdown body
  survives a forced Reader refresh, and Dashboard migration exposes
  progress / filtering / candidate detail / explicit approval.

### B. Host Bridge

#### B1. Host Bridge UTF-8 request body decoding

- Trigger: Host Bridge parsed request bodies as JavaScript strings, so
  non-ASCII JSON (notably Chinese note HTML written through
  `zotero-bridge`) was decoded as mojibake.
- Crossed seam: Host Bridge HTTP listener ↔ Zotero MCP HTTP listener
  (the same byte-vs-string parsing pattern lived in both places).
- Missed invariant: HTTP request bodies must be parsed from bytes via
  `Content-Length` and then UTF-8 decoded; malformed UTF-8 must
  surface as a structured request error.
- Current coverage: focused Host Bridge and MCP tests
  (`tests/host-bridge/106-host-bridge-server.test.ts`,
  `105-zotero-mcp-concurrency-policy.test.ts`,
  `101-zotero-mcp-server.test.ts`) use the production request-body
  path. They do not run inside a real Zotero process against a
  non-ASCII Zotero note payload.
- Primary sources: OpenSpec archive
  `2026-06-04-fix-host-bridge-utf8-and-resolver-cli-contract/proposal.md`.
- Candidate System E2E scenario:
  `host-bridge-utf8-round-trip-on-real-zotero` — install the XPI, write
  a Chinese-language note via the production `zotero-bridge` write
  capability, read it back, and assert exact byte equality.

#### B2. Host Bridge async socket lifecycle

- Trigger: the embedded Host Bridge HTTP socket could be torn down
  before the response stream was fully written, leaving the
  capability caller waiting on a closed socket.
- Crossed seam: Host Bridge transport loop ↔ MCP request handler.
- Missed invariant: socket teardown must release a response stream
  only after the underlying response object has completed, and a
  successful connection release must be separated from a failure/stop
  abort path.
- Current coverage: `tests/host-bridge/182-host-bridge-socket.integration.test.ts`.
- Primary sources: commit `a82a6670`.
- Candidate System E2E scenario:
  `host-bridge-socket-teardown-on-real-zotero` — drive a long-running
  capability call while the plugin is disabled / reloaded, and assert
  the response stream completes or fails with a typed code rather
  than truncating.

#### B3. ACP write approval routing per conversation

- Trigger: the conversation-specific `ZOTERO_BRIDGE_SCOPE` was being
  stored in the shared workspace profile, so connecting a second
  conversation could redirect a Host Bridge Zotero-write approval
  away from the invoking conversation.
- Crossed seam: ACP Chat adapter preparation ↔ Host Bridge CLI
  injection ↔ Assistant Workspace permission projection.
- Missed invariant: Host Bridge writes must remain attached to the
  invoking ACP owner and render as Zotero-write approvals even when
  multiple ACP conversations share one Host Bridge connection.
- Current coverage:
  `tests/host-bridge/109-host-bridge-acp-chat-permission.test.ts` and
  the ACP tests `96-acp-session-manager-permissions.test.ts`,
  `109-host-bridge-acp-chat-permission.test.ts`. None of these runs a
  real Zotero with two simultaneous ACP conversations.
- Primary sources: commit `bcca4390` (Jul 28, 2026).
- Candidate System E2E scenario:
  `host-bridge-acp-permission-routing-multi-conversation` — start two
  ACP Chat conversations against the same Host Bridge, trigger one
  Zotero-write approval from each, and assert each approval card
  resolves only the conversation that invoked it.

#### B4. HostApi version mismatch between plugin and built-in workflow package

- Trigger: `literature-workbench-package/lib/runtime.mjs` declared a
  `hostApi` major version that did not match the plugin's
  `WorkflowHostApi` v12 surface, blocking host capability routing.
- Crossed seam: built-in workflow package ↔ plugin Workflow Host API.
- Missed invariant: the workflow package must declare an explicit
  `hostApi` range the plugin can satisfy at runtime, and the plugin
  must reject installs whose declared range is unsupported.
- Current coverage: version-range parsing is unit-tested; there is no
  System E2E coverage that exercises the user-visible install path
  observed in issues #8 (workflow install fails on Zotero Beta) and
  #9 / #38 (Zotero 10 install / workflow package version check
  failure).
- Primary sources: commit `db0cd728` (Aug 10, 2026); GitHub issues
  `leike0813/zotero-agents#8`, `#9`, `#38`.
- Candidate System E2E scenario:
  `workflow-package-install-hostapi-version-mismatch` — install a
  workflow package whose `hostApi` range is one major ahead of the
  plugin, and assert the installer rejects it with a typed
  diagnostic; install a compatible version and assert the package
  activates and its capabilities route through `WorkflowHostApi`.

### C. ACP

#### C1. ACP Skills startup and cancellation liveness

- Trigger: `acpConnectionAdapter` published `connected` before
  initialize, session attach/new, and runtime configuration actually
  completed; task cancellation waited for backend cleanup before
  publishing a terminal run state; a stalled transport could
  therefore occupy a Host queue slot indefinitely and retain the
  duplicate-submission identity.
- Crossed seam: ACP adapter ↔ ACP transport ↔ ACP run store ↔ Host
  queue admission.
- Missed invariant: every ACP startup phase must be independently
  bounded to 60 s and cancellation-aware; `connected` must follow
  initialize + session + runtime config; task-cancel must publish a
  terminal before bounded backend cleanup while keeping disconnect
  recoverable and non-terminal.
- Current coverage:
  `tests/acp/100a-acp-npx-launch-cache.test.ts`,
  `107-acp-skillrunner-compatible-runner.test.ts`,
  `167-acp-skills-concurrent-submission.test.ts`. These tests run in
  Node + mock, not in a real Zotero with a real ACP backend.
- Primary sources: commit `63d57ff2` (Aug 10, 2026); OpenSpec archive
  `2026-08-10-fix-acp-skills-startup-and-cancellation-liveness/`.
- Candidate System E2E scenario:
  `acp-skills-stalled-startup-cancellation` — start a real ACP
  backend whose initialize response stalls past 60 s, cancel the
  queued submission, and assert the Host queue slot is released,
  the duplicate-submission identity is released, and a follow-up
  submission can be admitted.

#### C2. ACP interrupt lifecycle vs backend non-cancelled result

- Trigger: ACP treated a successful `session/cancel` notification as
  proof that the prompt had stopped, then accepted a backend
  non-cancelled result and either dropped it or mis-labelled it.
- Crossed seam: ACP Chat session ↔ ACP Skills orchestrator ↔
  Assistant Workspace reply state.
- Missed invariant: the current prompt must remain active after
  `session/cancel` is sent, accept trailing updates, and wait for
  the original `session/prompt` result; force-close only after 10 s
  of unconfirmed cancellation; preserve a backend's non-cancelled
  result.
- Current coverage: focused ACP unit tests
  (`96-acp-session-manager-lifecycle.test.ts`, the interrupt test
  added in `caeadcd3`); no E2E coverage against a real ACP backend
  that races cancel and result.
- Primary sources: commit `caeadcd3` (Jul 12, 2026); OpenSpec archive
  `2026-07-12-fix-acp-interrupt-lifecycle/`.
- Candidate System E2E scenario:
  `acp-prompt-interrupt-race-with-result` — start a real ACP backend
  whose prompt is in-flight, send `session/cancel`, immediately
  deliver a non-cancelled prompt result, and assert the Assistant
  Workspace surfaces the result, not the cancellation.

#### C3. ACP Chat Windows skill injection

- Trigger: ACP Chat normalizes paths for containment comparison but
  was then passing `C:/...` URLs to Zotero's native file APIs, which
  Zotero rejects, leaving the managed manifest populated while the
  workspace Skill roots remained empty.
- Crossed seam: ACP Chat workspace preparation ↔ Zotero native file
  APIs ↔ shared runtime directory-copy path.
- Missed invariant: managed Skill targets must retain native
  filesystem path syntax and readiness must reflect actual
  materialization.
- Current coverage:
  `test/core/106-plugin-skill-registry.test.ts` and the
  `96-acp-session-manager-transcript.test.ts` extensions in commit
  `3bda3667`. Neither runs against a real Zotero Beta/Windows process.
- Primary sources: commit `3bda3667` (Jul 28, 2026); OpenSpec archive
  `2026-07-28-fix-acp-chat-windows-skill-injection/`.
- Candidate System E2E scenario:
  `acp-chat-windows-skill-materialization` — install the XPI on a
  Windows Zotero Beta, start an ACP Chat backend, request one
  whitelisted Skill, and assert the workspace Skill roots are
  populated with native paths and the readiness status reports
  `ready`.

#### C4. AbortController missing in plugin runtime

- Trigger: `AbortController` is not present in some Zotero plugin
  environments; the SkillRunner ctl bridge used the global directly
  and crashed under those runtimes. The companion fix in `wait.ts`
  introduced an internal `CancellationController` shim and a resolver
  for the native constructor.
- Crossed seam: SkillRunner ctl bridge ↔ shared `wait.ts` utility ↔
  ACP runtime replay controller.
- Missed invariant: the plugin must not assume a global
  `AbortController`; bounded waits must go through the shared
  cancellation seam.
- Current coverage:
  `test/core/48-workflow-execution-seams.test.ts` and
  `test/core/107-acp-skillrunner-compatible-runner.test.ts` exercise
  the seam. There is no E2E coverage that exercises the seam under
  Zotero versions where the global is missing or behaves differently.
- Primary sources: commits `ed958b74` (Aug 10, 2026) and
  `902615c2` (Sept 4, 2026).
- Candidate System E2E scenario:
  `skillrunner-ctl-bridge-cancellation-across-zotero-versions` —
  drive a long-running SkillRunner ctl request through Zotero 7, 9,
  and 10 in the same compatibility lane, cancel the request mid
  flight, and assert the response settles with a typed code rather
  than leaking the listener or crashing the bridge.

### D. SkillRunner

#### D1. SkillRunner transcript publication lost across host detach

- Trigger: a temporary SkillRunner host detach reset the producer
  transcript revision without resetting the consumer, so the first
  reattached transcript publication was discarded as stale, and the
  reply listener retained the first interaction token.
- Crossed seam: SkillRunner `runDialog` ↔ Assistant Workspace
  reply controls ↔ shared managed-region DOM.
- Missed invariant: temporary host detach must preserve the
  transcript publication clock and the published transcript state
  until complete runtime teardown; stable reply controls must read
  the current validated action payload at click time without
  rebuilding managed DOM.
- Current coverage: production snapshot harness
  `test/helpers/skillRunnerWorkspaceSnapshotHarness.ts`,
  `test/core/71-skillrunner-run-dialog-ui-e2e-alignment.test.ts`,
  and `test/core/97-acp-ui-smoke.test.ts`. None runs against a real
  Zotero Beta or Linux Zotero chrome iframe.
- Primary sources: commit `dec28195` (Jul 20, 2026) and
  `1dafa40a` (Jul 22, 2026); OpenSpec archives
  `2026-07-20-fix-skillrunner-transcript-publication/` and
  `2026-07-22-fix-assistant-waiting-reply-and-skillrunner-transcript-reactivation/`.
- Candidate System E2E scenario:
  `skillrunner-transcript-publication-detach-reattach` — start a
  SkillRunner run, detach the SkillRunner host (sidebar close +
  reopen), reattach, and assert the transcript revision is
  monotonic, the run state is preserved, and managed-region DOM
  identity is unchanged.

#### D2. SkillRunner transcript microtask vs requestAnimationFrame/setTimeout

- Trigger: the SkillRunner sidebar chat could render an empty
  transcript on Linux even when the run completed successfully,
  because the transcript render scheduler relied on a
  `requestAnimationFrame -> setTimeout` chain that does not run
  reliably inside the Zotero Linux chrome iframe.
- Crossed seam: SkillRunner sidebar chat scheduler ↔ Zotero Linux
  chrome iframe event loop.
- Missed invariant: SkillRunner chat rendering must not depend on
  a timer scheduled from inside `requestAnimationFrame`.
- Current coverage: commit `1dafa40a`'s `97-acp-ui-smoke.test.ts`
  extensions assert revision gating and render-mode gating in
  Node + mock. There is no Linux real-host coverage.
- Primary sources: OpenSpec archive
  `2026-06-29-fix-skillrunner-transcript-microtask/proposal.md`.
- Candidate System E2E scenario:
  `skillrunner-chat-linux-chrome-iframe-render` — install the XPI on
  Linux Zotero 7, run a SkillRunner job whose transcript contains at
  least one full boundary, and assert the transcript row renders
  without a forced timer probe.

#### D3. SkillRunner submit handshake treated as low-priority health probe

- Trigger: provider execution preflight handshakes were being
  treated as background health probes, so the connection governor
  could skip them while the backend was busy, even though the
  handshake is part of the foreground submission path.
- Crossed seam: SkillRunner handshake resolver ↔ provider execution
  preflight ↔ connection governor.
- Missed invariant: execution preflight handshakes must use the
  submission lane and must not be skipped as low-priority probes.
- Current coverage: SkillRunner handshake and provider tests
  (`tests/skillrunner/167-skillrunner-handshake.test.ts` and the
  related provider tests). None runs against a real SkillRunner
  backend.
- Primary sources: OpenSpec archive
  `2026-07-05-fix-skillrunner-submit-handshake-lane/proposal.md`.
- Candidate System E2E scenario:
  `skillrunner-handshake-busy-backend` — start a real SkillRunner
  backend whose `/v1/jobs/{id}` is intentionally throttled,
  submit a job, and assert the preflight handshake completes on
  the submission lane rather than being skipped.

#### D4. CI deadlock between test suites

- Trigger: the GitHub Actions release workflow could deadlock while
  the Node + mock suite and the real-host suite ran in parallel
  against a shared temp directory.
- Crossed seam: CI scheduler ↔ shared suite governance.
- Missed invariant: the test-suite governance must serialize or
  isolate shared resources between parallel lanes.
- Current coverage:
  `test/node/core/58-suite-governance-constraints.test.ts`. There is
  no System E2E coverage of the cross-lane interaction.
- Primary sources: commit `d41d5462` (Jun 27, 2026).
- Candidate System E2E scenario:
  this is a CI / runner concern, not a user-visible scenario; it
  belongs in the runner-fault-control ticket (#51) rather than in
  the scenario catalog.

## Cross-cutting seam observations

- The codebase already follows an explicit `Boundary → Adapter → Test`
  discipline in unit / contract tests
  (`tests/synthesis/168-synthesis-sidecar-boundary.test.ts`,
  `tests/synthesis/218-synthesis-cross-language-sidecar-contract.test.ts`,
  `tests/synthesis/222-synthesis-reverse-host-broker.test.ts`,
  `tests/synthesis/225-synthesis-reverse-host-handlers.test.ts`,
  `tests/synthesis/226-synthesis-reverse-host-endpoint.test.ts`,
  `tests/acp/195-acp-tool-call-display-contract.test.ts`,
  `tests/host-bridge/108-mcp-host-bridge-mirror.test.ts`,
  `tests/host-bridge/186-host-bridge-output-boundaries.test.ts`).
  These prove the boundary contract but never the *real* plugin +
  *real* sidecar + *real* Zotero integration.
- The recurring bugs all share a pattern: a local boundary test
  proves the seam in isolation, but the regression only surfaces when
  the second process (real Zotero + real sidecar / ACP / SkillRunner
  backend) is involved. The OpenSpec changes for each regression
  consistently call out the missing end-to-end evidence in their
  "Impact" sections.
- Five invariants appear in three or more regressions and should be
  asserted at the System E2E layer in addition to the unit /
  contract layers:
  1. Protocol-strict request/response shape across the reverse-host
     boundary (A4, A5, B1).
  2. Lifecycle terminal-state convergence between the run store,
     transport layer, and UI projection (A2, A7, C1, C2, D1, D2).
  3. Provenance-preserving data classification across canonical /
     legacy / current / historical / distinct-vs-raw boundaries (A1,
     A6, A7).
  4. Capability / discovery handshake publication only after the
     owner is actually ready (A3, B3, C1).
  5. Typed JSON / UTF-8 transport decoding across Host Bridge, MCP,
     and sidecar loopback (B1, B2, A5).

## Implications for issue #41

- Phase 1 (Synthesis sidecar ↔ host + one Host Bridge canonical
  mutation replay) should seed from A1, A2, A3, A4, A6, A7, plus B1
  and B4.
- Phase 2 (ACP + SkillRunner) should seed from C1, C2, C3, D1, D2,
  D3, and C4.
- The five cross-cutting invariants above should become the
  System E2E assertion vocabulary used by the Phase 1 / Phase 2
  scenario catalog (issues #49 and #53) and by the execution matrix
  (issue #50). They already align with the existing
  `tests/zotero/e2e/full/300-lisongtao-gold.zotero.test.ts` pattern
  of asserting the Synthesis Index opens against the de-identified
  `lisongtao-v1` gold fixture.
- No production code or planning ticket outside this research branch
  was modified.

## Conflicts and uncertainty

- The candidate scenario names above are working titles; issue #55
  (OpenSpec handoff) is expected to rename them to match the project
  convention.
- Two regressions overlap:
  * `0f9d4c0d` (Synthesis hardening) and `72c74dca` (migration
    terminal outcomes) both touched the
    `literatureArtifactMigration` apply path; the System E2E
    scenario for A7 must cover both apply-classification and
    progress / detail / approval controls.
  * `c82055b0` (Citation repair) and `c82055b0`-era follow-ups in
    `575f1cbb` and `344c5649` all touch the same Zotero Host Broker
    boundary; the System E2E scenario for A6 should also assert the
    Topic / Citation-Graph surfaces (A4-adjacent) round-trip the
    same payload.
- Some commit messages describe a regression only in prose; the
  proposal / tasks documents in the corresponding OpenSpec archive
  were used to confirm the seam in those cases.
- The cross-language contract tests and the OpenSpec changes both
  reference artifacts that are not yet wired into a System E2E
  lane; the runner-fault-control ticket (#51) must close the gap
  before any of these scenarios can be scheduled in CI.

## Sources

- Git history (commits referenced inline)
- `openspec/changes/archive/2026-**/proposal.md` and `tasks.md`
  for every cited fix
- `tests/synthesis/`, `tests/acp/`, `tests/skillrunner/`,
  `tests/host-bridge/`, `tests/zotero/` test layout
- `docs/synthesis-layer/{state-machines,runtime-and-rebuild,workbench-ui,persistence-and-files}.md`
- `artifacts/zotero_7_9_10_compatibility_test_framework_design_guide.md`
- `CONTEXT.md` glossary
- GitHub issues:
  `leike0813/zotero-agents#41` (Wayfinder map),
  `#42`–`#55` (Wayfinder sub-issues),
  `#8`, `#9`, `#38` (open user reports that motivate the
  workflow-package install and Zotero 10 scenarios)
