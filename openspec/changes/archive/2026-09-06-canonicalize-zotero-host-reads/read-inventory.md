# Canonical Host read inventory

Baseline: `4fb76b73f3ec9744e905c39e45d0b86ac03b34ed`. This inventory covers
Broker source reads and their Bridge/MCP, Workflow, CLI and local consumers.
Selection, navigation and mutation contract changes retain their separate
issue #39 owners.

## Source contracts

| Broker member | Source and order | Cursor / bounds | Consumer and evidence |
| --- | --- | --- | --- |
| `library.listItems` | SQL count and `itemID` keyset; current-page hydration | Criteria-bound opaque cursor; 25/100; no TTL | Bridge list/search, Workflow traversal; Node/native 185, Broker 102 |
| `library.listCollections` | SQL collection identity keyset, current-page rows and ancestor path facts | Library-bound opaque cursor; 25/100; no TTL | Workflow options and bundle import; Node/native 185 |
| `library.listSavedSearches` | SQL Saved Search identity keyset; names are display facts | Library-bound opaque cursor; 25/100; default user library | Explicit Workflow member, Bridge/MCP and CLI; Broker/native 185 and schema_mode |
| `library.getItemNotes` / `getItemAttachments` | Child relationship SQL count/keyset; current-page hydration and detached summaries | Parent/domain-bound opaque cursor; 25/100 | Bundle/hooks, Synthesis notes, Bridge page-local file projection; 102/107/138/178 |
| `library.listAnnotations` | SQL native `sortIndex`, then item identity | Parent/domain-bound opaque cursor; 25/100 | Annotation export and bundles; Node/native 185, Broker 102 |
| `library.listNotePayloads` | Bounded note HTML and child attachment candidate pages, preserving duplicates | Source/content-bound opaque cursor; 25/100; `total:null`; empty continuation allowed; 1 MiB HTML/encoded/decoded bounds | Complete payload consumers and Synthesis; codec/Broker 102, 178 |
| `library.getItemDetail` / `getItemAuditState` / `getNoteDetail` | Single target native read and detached DTO | Domain content bounds; no artificial page envelope | Bridge and explicit Workflow; Broker 102 |
| `library.getNotePayload` | Complete bounded candidate scan before selecting a unique payload | Same source limits and ambiguity checks as payload pages | Workflow payload consumers; Broker 102 later-page duplicate and changed-basis cases |
| `library.readinessAudit` | One bounded item page, then bounded note/attachment/payload slices | Item cursor and retained readiness result; 100 items/50 ms yield | Bridge readiness, shared artifact evaluator; 107 and UI 48 |
| `library.exportAnnotations` / `exportPortableItems` | Page traversal / bounded ref projection | Trusted cancellation, item/time yields; complete result only after successful traversal | Bridge export and Workflow materialization; Broker 102 |
| `library.traverseItems` | Source item pages and detached callback batches | Existing coverage semantics; callback and digest outside admission | Workflow tag audit; Broker 102 |
| `library.syncSnapshot` | Bounded capture, basis recheck and detached delivery slices | 30-minute session TTL, 500/1000 public batches, 1M cap; interrupted capture has no completion evidence | Bridge/MCP, Workflow snapshot owner; Broker 102 and compatibility suite |
| `metadata.translateIdentifier` | Native setup followed by translator network wait | Trusted cancellation and late-result suppression; no assumed native abort API | Bridge and Workflow metadata; Broker 102 |

All asynchronous Broker native slices share one process FIFO. Signals are
checked before entry, between bounded targets and after awaited work; an
active canceled slice retains admission until native settle. Files, network,
callback and detached-data work run outside admission. Ordinary source errors
fail the whole page with canonical safe errors; adapters do not restart or
repaginate failed reads. `context.getCurrentView` and exact selection retain
the second change's semantics rather than acquiring new page contracts here.

## Contract boundary

The Workflow projection is defined by these files:

- `src/workflows/types.ts` declares portable refs, page request DTOs, the
  notes/payloads/attachments/annotations/Saved Search page DTOs, and the V12
  live-read signatures.
- `src/workflows/hostApi.ts` builds the explicit member-level projection and
  forwards the scoped `WorkflowCallControl` (including its default control).
- `src/workflows/workflowHostOwners.ts` supplies the live adapters and the
  complete research-bundle materializer. Its collection import and nested
  note, payload, attachment, and annotation reads use bounded page loops.
- `src/workflows/workflowHostContract.ts` publishes the Saved Search member;
  the manifest remains 23 top-level keys, 21 modules, and 88 callables.
- `test/helpers/zoteroHostCapabilityBrokerHarness.ts` fails closed for every
  read member, including `library.listSavedSearches`, so an incomplete test
  capability cannot silently fall back to a native read.

All ordinary source pages use the effective limit supplied by the source
(default 25, maximum 100). Complete consumers request 100, append only the
named page array, and continue while `hasMore` is true. A nonterminal empty
page is still followed; a missing or repeated cursor is an error. A page
read failure rejects the complete operation and no partial result is returned.
`getItemDetail`, `getNoteDetail`, and `getNotePayload` remain single-object
reads. There is no `T[] | Page` union, `Array.isArray` compatibility branch,
or array-loop escape hatch in the Workflow projection.

## Consumer and result migration

| Consumer group | Callers | Result handling |
| --- | --- | --- |
| Workflow parameter options | `src/modules/workflowParameterOptions.ts` | `listCollections` is read with limit 100 until `hasMore` is false. Collection summaries are then converted to parameter options; empty nonterminal pages and invalid cursors fail the resolution. |
| Research bundle import | `src/workflows/workflowHostOwners.ts` (`readCollectionTarget`) | Collection pages are traversed with limit 100 and cursor validation before a collection ref is resolved. |
| Research bundle materialization | `src/workflows/workflowHostOwners.ts` (`createWorkflowResearchBundleMaterializeApi`) | `readAllLibraryPages` completes notes, unknown-total payload candidates, note attachments, ordinary attachments, and annotations. Detail and payload-value reads remain single-object reads. Any nested page failure aborts the paper materialization. |
| Shared package page helper | `workflows_builtin/literature-workbench-package/lib/runtime.mjs` (`readHostPages`) | The helper follows `hasMore` even when the current page is empty and requires a fresh cursor. It returns the concatenated named page member to callers and propagates a failed page. |
| Note and payload consumers | `debug-note-artifact-inspector`, `debug-migrate-note-payloads`, `import-notes`, `literature-analysis`, `lib/digestPayload.mjs`, `lib/embeddedPayloadAttachments.mjs`, `lib/literatureDeepReadingBundle.mjs`, `lib/literatureDigestNotes.mjs` | Notes and payload candidates are consumed through `readHostPages`; each note's HTML or payload value is fetched through its single-object member. |
| Attachment consumers | `mineru/hooks/applyResult.mjs`, `add-digest-representative-image/hooks/applyResult.mjs`, `debug-note-artifact-inspector/hooks/applyResult.mjs`, `literature-analysis/hooks/applyResult.mjs`, `lib/literatureDigestNotes.mjs`, `lib/noteEmbeddedImages.mjs`, `lib/representativeImage.mjs`, `lib/translatorArtifacts.mjs` | Attachment pages are fully traversed before candidate selection. Page-local file descriptors retain the existing file locality and availability behavior. |
| Library item consumers | `lib/literatureBundle.mjs`, `collection-collector/hooks/applyResult.mjs` | Both complete collection/library enumerations use explicit limit-100 loops with `hasMore` and cursor guards. `tag-auditor/hooks/applyResult.mjs` intentionally reads one item page only to obtain the library id, then uses the callback-owned `traverseItems` abstraction for complete traversal. |
| Metadata and complete abstractions | `literature-metadata-curator/hooks/preflight.mjs`; Workflow `traverseItems`, `withItemSnapshot`, `readinessAudit`, and `exportAnnotations` projections | `translateIdentifier` and detail-like operations remain single public calls with their existing cancellation scope. Traversal and snapshot retain their callback-owned complete-consumption contracts; they are not converted into page-array unions. No package consumer repaginates these results. |
| Saved Search | V12 projection and contract conformance (`src/workflows/types.ts`, `hostApi.ts`, `workflowHostOwners.ts`, `workflowHostContract.ts`, `test/node/core/187-workflow-host-contract-governance.test.ts`) | The member is explicitly projected and counted in 23/21/88. No built-in package currently needs to enumerate Saved Searches, so no implicit full-read consumer was added. Bridge/MCP advertise the canonical page; CLI exposes `library saved-searches list`. |

The direct ordinary-read search found no remaining package call that treats a
notes, payloads, attachment, annotation, collection, or Saved Search result
as a bare array. The remaining direct `getNoteDetail` calls pass a detail
options object and do not require pagination.

## Synthesis and ACP boundary

`src/modules/synthesis/libraryAdapter.ts` owns a separate Synthesis Host read
port. Its `library.listItemsPage` delegates to the existing source page query
and its `artifacts.scanPage` returns one page with `nextCursor`/`hasMore`; a
whole-library Synthesis caller must continue those pages at the Synthesis
port boundary. The adapter does not call Workflow V12's legacy ordinary-read
helpers.

For each selected page item, `paperInputFromItem` builds the complete
per-paper sidecar input through the Broker's canonical `getItemNotes` pages.
It follows `hasMore` and `nextCursor` with an effective limit of 100, including
empty nonterminal pages, then reads each note detail as a single HTML object.
Each note's `listNotePayloads` result is also fully traversed; inline blocks are
projected from that note detail and embedded values use the canonical
`getNotePayload` single-object read. A missing or repeated continuation fails
the read, and a failed page or target read is not converted into a partial
sidecar. The external Synthesis Host port remains unchanged.

The generated-artifact and literature-score summary reuses the detached note
facts already collected for the sidecar input through
`summarizeLibraryGeneratedArtifacts`; it does not perform a second raw child
relationship read. The shared readiness evaluator uses source note and
attachment pages, bounded payload pages, cancellation checks, and detached
facts rather than caching raw Zotero child objects. The later-note/later-
payload behavior is covered by
`test/core/178-synthesis-host-read-ports.test.ts`; the UI readiness seam is
covered by `test/ui/48-library-artifacts-column.test.ts`.

The ACP modules have no direct ordinary Workflow V12 calls for notes,
payloads, attachments, annotations, or collections. ACP context/selection
reads remain in the second selection/current-view change. ACP's Synthesis
path uses the Synthesis read port described above.

## Legacy symbol audit and deletion ownership

The following ordinary legacy definitions have been removed from
`src/modules/zoteroHostCapabilityBroker.ts`:

- `listZoteroCollections`;
- `listLegacyZoteroLibraryItems`;
- `getLegacyZoteroItemDetail` and `getLegacyZoteroItemNotes`;
- `getLegacyZoteroNoteDetail`, `listLegacyZoteroNotePayloads`, and
  `getLegacyZoteroNotePayload`;
- `getLegacyZoteroItemAttachments`.

The final production/test symbol search finds no remaining definitions or
callers of these eight ordinary legacy exports. The separate
`getAllRegularZoteroItems` helper is not an orphan: `findExistingPaper` uses it
for metadata-ingest deduplication. It must move to a bounded identity/query
read under the write/ingest owner before it can be removed; it is not part of
the immediate DEL-02 deletion list.

The full-array payload resolver `listNotePayloadBlocksForItem` and its raw
attachment enumerator are also removed. Literature explainer now traverses
canonical payload pages before calling the single-payload reader. Broker,
literature bundle, and explainer tests reuse the complete fail-closed source
adapter in `test/helpers/zoteroLibraryPageQueryAdapter.ts`.

The remaining legacy imports in
`src/modules/hostBridgeCapabilityRegistry.ts` and
`src/modules/hostBridgeServer.ts` are current-view/selection or navigation
helpers (`getLegacyZoteroCurrentView`, `getLegacyZoteroSelectedItems`, and
`openLegacyZotero*`). They belong to the selection/current-view and navigation
changes. Native reads in `src/modules/synthesis/libraryAdapter.ts` are owned
by its Synthesis adapter and are not legacy Broker exports.

| Inventory | Current migration result | Remaining owner |
| --- | --- | --- |
| DEL-01 | Canonical Broker resolves every ordinary Bridge read; `LegacyHostBridgeReadProjection` and `injectedLegacyReadProjection` are removed. Workflow uses explicit page members. | `LegacyHostBridgeContextProjection` retains only current-view/selection for the second change. |
| DEL-02 | The eight orphan ordinary exports above are removed after caller migration. `getAllRegularZoteroItems` remains a metadata-ingest write caller and is excluded from this deletion batch. | Current/selected helpers: selection change; `openLegacyZotero*`: navigation change; ingest deduplication: write/ingest change. |
| DEL-05 | Workflow parameter options, research import, research materialization, and package collection enumeration now use bounded source pages. | Selection context pages and unrelated non-Zotero pagination remain with their owners. |
| DEL-16 | `ZoteroMcpToolCallQueue`, pending FIFO, positions and wait-time metrics are removed. Nine inflight admissions can progress concurrently. | Transport admission, watchdog, circuits, and retained timed-out handlers remain in MCP; native serialization belongs to Broker. |

## Verification seams

The following focused checks passed after the consumer and test-seam changes:

- `npm exec -- tsc --noEmit --pretty false`
- `npm exec -- tsx node_modules/mocha/bin/mocha "test/core/102-zotero-host-broker-capability-api.test.ts" --require test/setup/zotero-mock.ts --grep "normalizes Host file paths" --exit` — 1 passing; the mock now supplies `IOUtils.stat` and asserts the normalized Windows path.
- `npm exec -- tsx node_modules/mocha/bin/mocha "test/node/core/187-workflow-host-contract-governance.test.ts" --require test/setup/zotero-mock.ts --exit` — 16 passing.
- `npm exec -- tsx node_modules/mocha/bin/mocha "test/workflow-literature-workbench-package/47-workflow-literature-bundle.test.ts" "test/workflow-literature-workbench-package/48-workflow-research-bundle.test.ts" --require test/setup/zotero-mock.ts --exit` — 35 passing.
- `npm exec -- tsx node_modules/mocha/bin/mocha "test/core/137-literature-search-ingest-workflow.test.ts" "test/core/178-synthesis-host-read-ports.test.ts" "test/workflow-literature-analysis/23-workflow-literature-analysis-fixtures.test.ts" --require test/setup/zotero-mock.ts --exit` — 26 passing, 10 fixture-matrix cases pending in this environment.

The Windows native runner's `spawn EINVAL` was corrected in its npm launch
adapter. Zotero 7.0.32, 9.0.6 and 10.0.1 each passed 43 behavior checks using
the short `D:/zc39` runs root. Exact commands, receipts and the unrun
Linux/macOS boundaries are recorded in `verification.md`.
