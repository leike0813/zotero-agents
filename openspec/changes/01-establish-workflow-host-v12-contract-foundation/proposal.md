## Why

Workflow Host v12 cannot be implemented safely while portable references, strict-JSON values, call control, error details, and projection ownership remain distributed across the current v11 facade and its adapters. This change establishes the projection-neutral contract foundation all later v12 slices use without publishing a partial v12 surface.

The fixed implementation baseline is `4dbddc24e884921262c559428bf851db5eadf2d7`.

## What Changes

- Introduce one projection-neutral Workflow Host error contract with eleven stable codes, code-specific closed details, strict-JSON normalization, and safe construction helpers.
- Consolidate portable item and collection references, canonical JSON types, trusted in-process exceptions, shared DTO identity, and `WorkflowCallControl`.
- Require Broker public inputs to use portable references and require `ZoteroHostCapabilityError` to conform to the shared public error contract.
- Establish recursive exactness and contract-variant rules for the eventual v12 projection while keeping the active public identity at v11.
- Record the member-level projection rule: Broker growth never widens Workflow Host implicitly.
- Defer the complete 23/21/85 v12 manifest, consumer migration, version flip, and v11 removals to `harden-workflow-host-api-v12`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-contract`: Add the portable DTO, strict-JSON, call-control, error-contract, variant-shape, and exact-projection invariants required by v12.
- `zotero-host-capability-broker`: Make portable references and shared coded failures the canonical Broker-facing contract without widening Workflow Host.
- `zotero-host-broker-capability-api`: Require stable safe errors and fail-closed adapters at the Broker capability seam.

## Impact

- Contract sources: `src/workflows/types.ts`, `src/workflows/workflowHostContract.ts`, and a new `src/workflows/workflowHostErrorContract.ts`.
- Broker owner: `src/modules/zoteroHostCapabilityBroker.ts`.
- Tests: Broker capability conformance and Workflow Host contract governance.
- Dependency: every v12 vertical change depends on this foundation; no production facade reports `version: 12` until final activation.
- No persisted-data migration, Host Bridge exposure, dependency change, release action, or generated-document edit.
