## Why

Selection still promotes attachments, serializes a raw rich tree, and can be reacquired during workflow preparation. Issue #39's second change makes exact Broker selection pages and locked portable refs the single input boundary, preserving task-specific source policies across local and remote execution.

## What Changes

- **BREAKING**: Replace selected-item snapshots with exact, stateless, basis-bound pages (default 25, maximum 100); remove promotion and the 10,000-item snapshot limit.
- **BREAKING**: Replace rich SelectionContext and native/id-only selection inputs with ordered canonical facts and strict portable refs throughout ACP, Workflow, Bridge/MCP/CLI and durable agent runs.
- Preserve current-view library-tree source facts in the canonical small DTO; remove embedded item selection and legacy context projections and repagination.
- Preserve named task selection policies, resolve attachment paths only at the final local input adapter, and remove duplicate selection helpers and live fallbacks.
- Update tests, actual affected documentation and governed surfaces; independently verify, synchronize and archive this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `selection-context`: Exact pages and ordered locked facts replace snapshots and rich trees.
- `workflow-input-planning-protocol`: Canonical task inputs and immutable unit membership.
- `workflow-host-api-v12`: Paged selection signatures and explicit projection.
- `zotero-host-broker-capability-api`: Exact JSON selection and minimal attachment creation-time facts.
- `zotero-host-capability-broker`: Canonical current-view source identities.
- `host-bridge-workflow-control`: Strict explicit refs, durable inputs and canonical context routes.
- `host-bridge-cli-interface`: Selection page and strict portable-ref invocation contracts.
- `workflow-settings-single-source-submit-flow`: One basis-consistent acquisition per trigger.

## Impact

Depends on archived `canonicalize-zotero-host-reads`. Affects Broker/shared types, selection and input planning/compiler/runtime, ACP and workflow acquisition, Bridge/MCP/CLI contracts, built-in hooks, existing interface tests and affected source guidance. No dependencies, generic capability framework, persistent selection cache, compatibility projection, mutation/artifact/navigation redesign, commit or publication. Debug migrator selection migrates here; its entrance removal belongs to the artifact change.
