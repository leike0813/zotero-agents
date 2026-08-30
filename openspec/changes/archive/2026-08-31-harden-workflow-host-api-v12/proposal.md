## Why

The preceding vertical slices can make each owner implementation-ready, but callers still observe the legacy v11 facade, compatibility range, raw escape hatches, and flat aliases until one atomic cutover. This change publishes exactly one coherent v12 shape and removes every approved legacy path in the same activation.

The fixed implementation baseline is `4dbddc24e884921262c559428bf851db5eadf2d7`. Implementation requires `01-establish-workflow-host-v12-contract-foundation` through `07-add-workflow-host-synthesis-facade` to be complete and verified; the subprocess companion is required for the overall runtime-adaptation completion report but does not define this public surface.

Architecture source: [`artifact/workflow-host-v12-architecture-decisions.md`](../../../artifact/workflow-host-v12-architecture-decisions.md), especially §§3.3–3.9, 4.1–4.4, 7, 14.1–14.7, 15.1, 16–18, and 19.6–19.7. That record is authoritative for the exact 23/21/87 manifest, hard-cut deletion ledger, variant parity, deferred inventory, documentation closure, and final architecture review.

## What Changes

- **BREAKING** Set Workflow Host identity to `version: 12` and add `interactionMode` while publishing the exact 23 top-level keys, 21 nested modules, and 87 callable members frozen by the architecture record.
- **BREAKING** Remove public `items`, `prefs`, `parents`, generic `tags`, generic `collections`, `command`, legacy `literature`, v11 aliases, and flat Synthesis names without compatibility adapters.
- **BREAKING** Remove workflow-visible `runtime.zotero`, `runtime.handlers`, host-capable `runtime.helpers`, hook-visible `IOUtils`, and direct clipboard access.
- Compose every member explicitly from its owner; interactive and non-interactive variants keep identical shape and differ only through stable deny behavior.
- Change the literature-workbench package guard from the v2-v11 range to exact v12 and migrate all built-in consumers.
- Establish the code-native readonly manifest as runtime identity and the new `workflow-host-api-v12` spec as the canonical public contract; prevent duplicate member manifests.
- Synchronize current documentation, package manifests, conformance checks, and consumer governance in the same cutover.

## Capabilities

### New Capabilities

- `workflow-host-api-v12`: Define the complete v12 public interface, version identity, variants, exact shape, hard cut, and approved removal inventory.

### Modified Capabilities

- `workflow-contract`: Replace the active v11 identity and compatibility assumptions with the exact v12 contract.
- `workflow-loader-contract-hardening`: Remove raw runtime injections and require the closed v12 host projection.
- `workflow-docs-contract-alignment`: Make current documentation and contract declarations describe only v12.
- `builtin-workflow-package-and-sync`: Require built-in packages and synchronized copies to target exact v12.
- `literature-workbench-workflows`: Migrate all built-in consumers from raw, legacy, and flat members to the v12 modules.

## Impact

- Composition and runtime: `src/workflows/types.ts`, `hostApi.ts`, `workflowHostContract.ts`, `runtime.ts`, and `loader.ts`.
- Consumers: literature-workbench, Synthesis layer, workflow debug probe, MinerU, workflow test helpers, and package guards.
- Documentation and specs: Workflow Host, Broker SSOT, hook helpers, package/manifests, and canonical OpenSpec.
- Tests: recursive exact-shape conformance, 23/21/87 metrics, variants, package compatibility, static escape-hatch scans, and all affected workflow packages.
- No automatic Host Bridge/MCP exposure beyond the separately approved full-library snapshot, no persisted-data migration, dependency change, release, or generated help-doc edit.
