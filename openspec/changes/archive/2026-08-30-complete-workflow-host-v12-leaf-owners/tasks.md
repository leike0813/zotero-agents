Implementation baseline: `4dbddc24e884921262c559428bf851db5eadf2d7`. Keep the active Workflow Host identity at v11; this change prepares owners only.

## 1. Baseline and Contract Gates

- [x] 1.1 Record the current definitions, callers, and focused test entry points for all eight leaf owners and verify no context/navigation, library, mutation authority, Research Bundle layout, Synthesis, activation, consumer-cutover, or legacy-deletion work entered this change.
- [x] 1.2 Extend `test/node/core/187-workflow-host-contract-governance.test.ts` with failing staged-owner conformance for exact leaf DTOs, portable inputs, interaction variants, owner provenance, and active-v11 non-activation; verify the new cases fail for the missing owner behavior without snapshotting source text or field order.
- [x] 1.3 Finalize the leaf DTOs and narrow owner interfaces in `src/workflows/types.ts`; verify TypeScript exactness and the unchanged production v11 contract gate. Defer explicit staging composition until every concrete owner exists so composition cannot hide stubs.
- [x] 1.4 Extend the execution-seam tests first for trusted run/caller scope, all-path terminal cleanup, foreign-scope denial, and unchanged v11 hook injection; wire leaf scopes through the existing admitted execution lifecycle and verify no owner accepts caller-supplied identity.

## 2. Prepared Images and Note Consumption

- [x] 2.1 Extend `test/core/90-workflow-note-image-preparation.test.ts` first with portable file/resource/base64 sources, signature and MIME checks, SHA-256 metadata, 32 MiB input, 8,192-pixel edge, 8 MiB result, option-order, and 64 MiB per-run registry boundaries; verify the new tests fail against the legacy Blob/result contract.
- [x] 2.2 Deepen `src/workflows/workflowNoteImagePreparation.ts` with portable validation, immutable opaque refs, workflow-run ownership, aggregate accounting, trusted lookup, late-bound `runtimePersistence`/resource reads, and idempotent terminal cleanup while retaining one conversion policy; verify task 2.1 tests pass and no second image encoder or filesystem selector is introduced.
- [x] 2.3 Extend the existing Broker/note mutation tests first with same-run ref consumption, foreign/forged/expired refs, logical slot validation, multi-image staging failure, note-commit compensation, cleanup residue, and idempotent replay; then bind note create/update to the trusted prepared-image resolver and verify one receipt covers the note and affected attachments without exposing prepared bytes or paths.
- [x] 2.4 Keep the v11 path/Blob/byte adapter behavior outside the new owner contract and verify existing representative-image, score-note, and note-image compatibility tests still pass without adding a second registry or premature v12 consumer migration.

## 3. Bibliography Owner

- [x] 3.1 Extend `test/core/102-zotero-host-broker-capability-api.test.ts` first with stable format listing, live availability, ordered declared fallback, option-schema validation, portable regular-item resolution, duplicate/missing/non-regular rejection, cancellation, 10,000-item and 64 MiB limits, and safe errors; verify the cases fail against legacy `items.exportText`.
- [x] 3.2 Replace `src/modules/zoteroItemTextExporter.ts` with the deep `src/workflows/bibliography.ts` owner that contains the single stable format registry and native translator adapter, then update explicit Broker/host composition and the temporary v11 adapter; verify task 3.1 and existing ordered-export tests pass with no native translator identity in public DTOs.
- [x] 3.3 Verify the staged bibliography owner is ready for Research Bundle consumption while bundle filenames, manifests, archive, and delivery stay with their existing owners; record the current duplicate UUID/format policy in `bundleBibliography.mjs` as an activation migration target and do not migrate that official consumer or widen v11 early.

## 4. Addon, Environment, and Clipboard

- [x] 4.1 Add failing focused tests for exact addon identity, per-call environment late binding, closed platform/locale/version fallbacks, forbidden capability-discovery fields, and unchanged v11 `prefsPrefix` compatibility; implement the thin leaf adapters in `src/workflows/hostApi.ts` by reusing `runtimeBridge`, `detectRuntimePlatform`, and `resolveRuntimeLocale`, and verify no detector or locale parser is duplicated.
- [x] 4.2 Add failing interface tests for absent versus empty clipboard text, `writeText("")`, true clear, 16 MiB UTF-8 bounds, cancellation, content-safe errors, in-memory Node behavior, and identical interactive/non-interactive shape with stable deny behavior.
- [x] 4.3 Implement the sole new deep module `src/workflows/clipboard.ts` with injected per-call adapters and the closed plain-text contract; explicitly compose it for staging without migrating the built-in direct clipboard consumer, and verify task 4.2 plus contract governance tests pass.

## 5. Editor Owner

- [x] 5.1 Extend `test/ui/44-workflow-editor-host.test.ts` first with inline session renderers, bounded strict-JSON state/context/result, action and close results, caller-scoped concurrency, deterministic queueing, detached/auto-close timer cleanup, and non-interactive denial; verify the stable behavior tests fail before refactoring.
- [x] 5.2 Deepen `src/modules/workflowEditorHost.ts` so each session owns its inline renderer and lifecycle while the renderer-id registry remains only as a temporary internal/v11 adapter; migrate staging composition, verify task 5.1 and existing workflow editor callers pass, and confirm no callback, DOM object, or renderer registry enters the staged public DTO.

## 6. Notifications and Logging

- [x] 6.1 Extend `test/core/48-workflow-execution-seams.test.ts` first with workflow toast request validation, default type, 4,096-code-unit limit, per-caller five-visible limit, cross-caller isolation, fire-and-forget result, Notification Hub observation, and non-interactive logging/deny behavior; keep the existing global three-toast lifecycle policy as a separate tested rule.
- [x] 6.2 Add the workflow-callable toast adapter to `src/modules/workflowExecution/feedbackSeam.ts` and reuse `notificationHub.ts` without creating a second notification owner; verify task 6.1 tests pass and no native ProgressWindow/handle is returned.
- [x] 6.3 Extend `test/core/45-runtime-log-manager.test.ts` first with the narrow workflow request DTO, Host-bound identity, per-field/message/details bounds, strict-JSON validation, secret/path/native-error sanitization, non-interactive parity, and absence of test probes; verify unsafe or oversized input stores no partial entry.
- [x] 6.4 Add the workflow-scoped adapter factory to `src/modules/runtimeLogManager.ts`, reusing the current append, sanitization, retention, and persistence pipeline; keep the broad internal input and probes behind internal harness seams, and verify task 6.3 tests pass without a second log store or sanitizer.
- [x] 6.5 Compose every completed leaf owner explicitly in `src/workflows/hostApi.ts` with fail-closed interactive/non-interactive adapters; verify member-level provenance, exact candidate shape, and unchanged active-v11 production identity without a spread, proxy, catalog, or stub.

## 7. Completion

- [x] 7.1 Run all focused leaf-owner, Broker/note, Research Bundle, editor UI, notification, logging, and contract-governance suites; resolve task-scoped failures and record pass/fail/pending evidence without treating Zotero-runtime-only pending cases as passes.
- [x] 7.2 Run `npm run test:node:core`, `npm run test:node:workflow`, relevant Zotero suites when the local runner is available, `npx tsc --noEmit --pretty false`, `npm run lint:check`, `npm run build`, and `git diff --check`; record results and causes for any unavailable gate.
- [x] 7.3 Run `openspec validate complete-workflow-host-v12-leaf-owners --strict --no-interactive`, verify the active production identity remains v11, and produce completion evidence for all eight owner contracts so `harden-workflow-host-api-v12` prerequisite task 1.1 can be rerun without claiming activation work complete.

## Implementation Evidence

### 1.1 Baseline leaf-owner inventory

- `addon`: partial in `src/workflows/hostApi.ts`; v11 returns `prefsPrefix` and lacks the staged `addonVersion` identity.
- `environment`: no owner; staging must reuse `runtimeBridge`, `detectRuntimePlatform`, and `resolveRuntimeLocale` with per-call reads.
- `images`: conversion exists in `src/workflows/workflowNoteImagePreparation.ts`, but its public input/result are path/Blob/bytes and Blob/diagnostics rather than portable source plus run-scoped managed ref. Focused tests: `test/core/90-workflow-note-image-preparation.test.ts` and Broker/note cases in `test/core/102-zotero-host-broker-capability-api.test.ts`.
- `bibliography`: native translation exists in `src/modules/zoteroItemTextExporter.ts`, while `bundleBibliography.mjs` duplicates format identities. There is no stable `listFormats/render` owner. Focused tests: Broker API and Research Bundle suites 47/48.
- `clipboard`: no production owner; a package helper directly uses navigator. A single new `src/workflows/clipboard.ts` is approved, but built-in consumer migration remains activation work.
- `editor`: `src/modules/workflowEditorHost.ts` owns dialogs and sequential sessions but publishes renderer-id registry semantics. Focused test: `test/ui/44-workflow-editor-host.test.ts`.
- `notifications`: `feedbackSeam.ts` and Notification Hub own lifecycle feedback; staged callable toasts need a distinct five-per-caller reject policy. Focused test: `test/core/48-workflow-execution-seams.test.ts`.
- `logging`: `runtimeLogManager.ts` owns storage/sanitization but exposes a broad internal input and test probes. Focused test: `test/core/45-runtime-log-manager.test.ts`.
- Explicit exclusions confirmed: context/navigation/library/metadata (03), snapshots (04), canonical mutation/notes/attachments/status tags except prepared-ref resolution (05), Research Bundle layout and file/archive/resources (06), Synthesis (07), version/manifest/runtime injection/package guard/consumer migration/deletion (activation).

### 3.1–3.3 Bibliography evidence

- The new `src/workflows/bibliography.ts` is the only stable format registry and native export adapter; `ZoteroHostCapabilityBroker.bibliography` projects it explicitly, while v11 `items.exportText` reuses the same module.
- Focused bibliography plus legacy ordered-export tests: 3 passing. TypeScript no-emit check passed.
- `bundleBibliography.mjs` still contains Better BibTeX/BibTeX UUID and result-shape policy. It is intentionally unchanged because migrating that official consumer or adding `hostApi.bibliography` to production would violate this change's v11 non-activation boundary; it remains in activation task 5.1/6.1.

### 1.4 and 2.1–2.4 execution/image evidence

- `runtime.ts` creates one Host-owned leaf scope around the existing admitted execution hook lifecycle, exposes it only through a module-private lookup, and disposes prepared refs on every terminal path. Caller input cannot provide the run or caller identity.
- `workflowNoteImagePreparation.ts` now owns portable source validation, the existing conversion policy, immutable run-scoped refs, exact input/dimension/output/live-byte limits, SHA-256 metadata, trusted resolution, and idempotent cleanup. All filesystem selection still routes through `runtimePersistence`.
- Broker note create/update validates logical image slots before write, stages every prepared image before attachment creation, compensates failed note commits, removes superseded plugin-managed images after success, and records note/attachment effects in the canonical receipt. The legacy v11 path/Blob/byte adapter and Research Bundle two-stage binding remain compatibility adapters outside the staged owner.

### 4.1–6.5 remaining owner evidence

- `hostApi.ts` reuses the existing runtime/version/platform/locale facts for exact addon and per-call environment owners. `clipboard.ts` is the only clipboard deep module and preserves absent versus empty text, true clear, cancellation, UTF-8 limits, safe errors, and equal interactive/non-interactive shape.
- `workflowEditorHost.ts` owns inline renderers and bounded strict-JSON session values, queues staged sessions per trusted caller, and cleans dialogs/timers in `finally`; the renderer registry remains only for the v11 adapter.
- `feedbackSeam.ts` reuses Notification Hub for validated per-caller workflow toasts. `runtimeLogManager.ts` binds trusted execution identity to the existing append/sanitize/retention/persistence pipeline. Neither owner exposes native handles or internal test probes.
- `createWorkflowHostLeafScope()` explicitly composes exactly `addon`, `environment`, `images`, `bibliography`, `clipboard`, `editor`, `notifications`, and `logging`; it uses no spread, proxy, runtime catalog, or placeholder. Production `createWorkflowHostApi()` remains v11.

### 7.1–7.3 verification evidence

- Focused leaf-owner, Broker/note, Research Bundle, editor UI, notification, logging, and governance run: 228 passing, 0 failing, 0 pending.
- `npm run test:node:workflow`: 256 passing, 25 pending, exit 0. Pending cases were reported as pending and were not counted as passes.
- `npm run test:node:core` exposed five non-task-scoped failures. An isolated rerun produced 156 passing and the same five failures: two Synthesis UI source-contract assertions, two Host Bridge `library snapshot` fixture/continuation assertions, and the dependent collection-collector fixture. None of their source or test files is changed by this prerequisite; expanding into those domains would violate the approved exclusions.
- The installed Zotero runner was attempted with `npm run test:zotero:workflow`, but the harness could not connect to Zotero after retrying (`ECONNREFUSED 127.0.0.1:41771`), so no Zotero-runtime case is reported as passed.
- `npx tsc --noEmit --pretty false`, `npm run lint:check`, `npm run build`, and `git diff --check` passed. The build-generated help-doc timestamp was restored because generated help docs are outside this change.
- `openspec validate complete-workflow-host-v12-leaf-owners --strict --no-interactive` passed. Contract-governance tests confirm all eight candidate owners and the unchanged active v11 identity; no activation, consumer cutover, or legacy-deletion claim is made.
