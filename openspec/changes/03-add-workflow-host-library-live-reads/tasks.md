Implementation baseline: `4dbddc24e884921262c559428bf851db5eadf2d7`. Apply after `01-establish-workflow-host-v12-contract-foundation`.

## 1. Read Contract Tests

- [ ] 1.1 Extend `test/core/102-zotero-host-broker-capability-api.test.ts` with failing category detail, note/payload/attachment/annotation, portable export, collection page, cursor binding, and fail-closed tag cases.
- [ ] 1.2 Extend `test/core/185-zotero-library-page-query.zotero.test.ts` with failing stable-order, normalized-criteria, continuation, invalid-cursor, empty-library, and hard-limit cases without asserting internal query order.
- [ ] 1.3 Extend `test/workflow-tag-auditor/66-tag-compliance.test.ts` with failing serial traversal, cancel, resource-limit, callback rejection, empty completion, and completion-evidence cases.

## 2. Canonical DTO and Serializer Owner

- [ ] 2.1 Add the live-read request/result, discriminated item summary/detail, collection, annotation, navigation, selection, batch, terminal, and completion-evidence types to `src/workflows/types.ts`; verify every reachable public type has one declaration.
- [ ] 2.2 Deepen `src/modules/zoteroHostCapabilityBroker.ts` serializers for regular items, notes, payloads, attachments, annotations, collections, and portable export; verify read failure or truncation cannot appear as complete empty state.

## 3. Pages and Traversal

- [ ] 3.1 Implement canonical `listItems` and `listCollections` pages with resolved user library, stable identity order, centralized limits, criteria-bound opaque cursors, and accurate page metadata; verify Broker and Zotero page tests pass.
- [ ] 3.2 Implement `traverseItems` with `top-level-regular` scope, serial callbacks, defaults/hard maxima, resume cursor, cancellation checks, statistics, and no full-result array; verify traversal tests pass.
- [ ] 3.3 Implement process-scoped criteria/coverage completion evidence from the exact delivered revisions/tag digests and issue it only after cursor exhaustion; verify canceled, failed, and resource-limited runs cannot verify evidence.

## 4. Context Navigation and Consumers

- [ ] 4.1 Implement portable `context.getSelectedItems` and navigation adapters with the fixed 10,000-selection limit and non-interactive deny behavior; verify selection order, duplicate rejection, cancellation, and kind mismatch tests.
- [ ] 4.2 Migrate `src/modules/selectionSample.ts`, workflow collection parameter options, and tag-auditor internals to canonical Broker reads while keeping the active v11 facade compatible; verify their workflow tests pass.
- [ ] 4.3 Prepare explicit library/context/navigation adapters in `src/workflows/hostApi.ts` without changing version or public v11 member identity; verify contract governance detects no partial v12 exposure.

## 5. Completion

- [ ] 5.1 Run Broker, Zotero page, tag-auditor, selection, and workflow-read suites, then `npm run test:node:core`, `npm run test:node:workflow`, relevant Zotero tests, `npm run build`, lint checks, and strict OpenSpec validation; record all results.
- [ ] 5.2 Review for raw Zotero output, caller cursor loops, `searchItems` reimplementation, snapshot claims, collection tree/detail additions, or v11 alias deletion; verify every prohibited count is zero.
