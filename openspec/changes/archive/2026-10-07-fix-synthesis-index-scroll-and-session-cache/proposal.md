# Proposal

## Why

Index removes expanded reference rows while scrolling because its virtual window measures only parent rows. Repeated whole-page readiness reads and discarded surface identities also make expansion and reopening slow; notifier DTO adaptation produces invalid requests and incorrect echo receipts.

## What Changes

- Measure parent and reference rows in one virtual window and preserve scroll anchors during updates.
- Publish an initial 25-item Index batch and progressively fill the existing 100-row window.
- Read expanded references for explicit source refs without whole-library or readiness rereads.
- Retain bounded, invalidatable Index data within one Zotero session.
- Correct echo request/result adaptation and distinguish custom-column repaint notifications from data changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-workbench`: Progressive, basis-bound Index reads and bounded source details.
- `synthesis-workbench-ui-client-consumer`: Session reuse, incremental updates, scroll identity, and precise invalidation.

## Impact

Workbench host/page rendering, native Reference Application, TypeScript/Rust protocol schemas and corpora, library column notifications, existing behavior tests, and developer documentation. No new dependencies or disk cache.
