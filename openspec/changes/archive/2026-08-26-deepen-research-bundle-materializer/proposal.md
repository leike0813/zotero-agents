## Why

Workflow Research Bundle paper materialization currently spreads paper-ref parsing, deduplication, missing-paper handling, artifact selection, and warning projection across the Workflow Host composition root and the Research Bundle module. Deepening the existing module concentrates canonical materialization policy behind one interface while preserving every Workflow Host API v11 and direct-export behavior.

## What Changes

- Add one pre-bound Research Bundle materializer interface that accepts Workflow Host v11-shaped paper requests.
- Move canonical paper-ref parsing, first-order deduplication, fail-soft paper resolution, and the fixed four-artifact policy behind that interface.
- Keep raw Zotero-to-portable DTO resolution and `core_source_missing` compatibility projection in the Workflow Host adapter.
- Keep direct paper and Topic export selector, artifact-subset, warning, delivery, and publication semantics unchanged.
- Remove duplicate paper orchestration and full artifact-set literals from Workflow Host composition.
- Record the Research Bundle Materialization domain term and synchronize the Host Capability Broker SSOT documentation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change implements the existing `research-bundle-workflow` shared-materialization contract and `zotero-host-capability-broker` owned-module/runtime-late-binding contract without changing observable requirements.

## Impact

- Affects the Research Bundle materialization module, Workflow Host projection adapter, and the Synthesis artifact-reader adapter shape.
- Preserves Workflow Host API v11, workflow package inputs/results, direct export manifests, Product schemas, and runtime filesystem selection.
- Adds no dependencies, public host members, parallel modules, or migration requirements.
