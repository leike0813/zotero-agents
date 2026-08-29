## Why

Workflows need bounded, portable Zotero reads and complete live traversal evidence without receiving raw Zotero objects or reimplementing cursor loops. The current v11 reads mix aliases, incomplete arrays, and raw access paths that cannot support the v12 hard cut.

The fixed implementation baseline is `4dbddc24e884921262c559428bf851db5eadf2d7`; this change depends on `01-establish-workflow-host-v12-contract-foundation`.

## What Changes

- Establish `library.listItems` as the canonical bounded page and query contract with stable identity ordering and opaque criteria-bound cursors.
- Add Host-owned `library.traverseItems` with serial callbacks, cancellation, budgets, resume cursors, statistics, and completion evidence.
- Add canonical bounded collection, annotation, note, payload, attachment, item-detail, portable-export, selection, and navigation reads.
- Make tag-summary read failure or truncation fail closed rather than look like an empty complete result.
- Move workflow collection-option and selection consumers to canonical Broker reads.
- Keep live traversal explicitly distinct from the stable full-library snapshot feed.
- Prepare internal adapters without changing the active v11 facade; public alias and raw-domain removal occurs only during final activation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `zotero-host-capability-broker`: Add canonical bounded library read and traversal ownership behind portable DTOs.
- `zotero-host-broker-capability-api`: Specify pages, cursors, traversal completion evidence, category-aware details, and fail-closed read behavior.
- `zotero-library-keyset-pagination`: Bind stable ordering, normalized criteria, budgets, and continuation to canonical Broker reads.
- `selection-context`: Make selected-item capture portable, bounded, asynchronous, and cancelable.

## Impact

- Broker and contract sources: `src/modules/zoteroHostCapabilityBroker.ts`, `src/workflows/types.ts`, and internal adapters in `src/workflows/hostApi.ts`.
- Consumers: selection sampling, workflow parameter options, tag auditing, and existing library readers.
- Tests: Broker capability API, Zotero library page query, tag-auditor traversal, and workflow read behavior.
- No stable snapshot claim, annotation export, collection tree/detail API, raw-object output, dependency, or persisted-data migration.
