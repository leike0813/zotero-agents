## Why

Zotero navigation is currently split between legacy Broker helpers, direct Host Bridge routes, MCP mirrors, and CLI commands. That split permits inconsistent validation, window targeting, scope admission, and success claims. The read and selection changes now provide the canonical refs and bounded host access needed to make navigation one explicit capability family.

## What Changes

- **BREAKING**: Add seven Broker-owned navigation operations for focus, library view, collection, Saved Search, item reveal, item open, and exact Reader locations.
- **BREAKING**: Require portable refs, closed view/location DTOs, one captured target window, complete pre-effect validation, bounded reveal targets, and minimal dispatch results.
- Add shared Bridge/MCP/CLI registry projections with request-header caller-scope admission and no per-call approval for eligible operator or interactive callers.
- Remove the Workflow Host v12 `navigation` projection and its availability/error/conformance surface.
- Remove the legacy `/context/*/open` REST routes and `context ... open` CLI commands, builders, aliases, and generated command cards.
- Preserve native no-op dispatch semantics and report unsupported or unverifiable Reader targeting through stable structured errors without fallback or automatic retry.

## Capabilities

### New Capabilities

None. Navigation already has a Broker capability family; this change closes and canonicalizes its contract.

### Modified Capabilities

- `zotero-host-broker-capability-api`: define the seven portable navigation inputs, results, errors, cancellation boundary, and exact-window behavior.
- `workflow-host-api-v12`: remove the full Workflow Host navigation projection and related conformance expectations.
- `host-bridge-service`: register and route canonical navigation capabilities and remove direct context-open routes.
- `zotero-mcp-host-bridge-capability-catalog`: mirror the registry and enforce request-header list/call scope rules.
- `host-bridge-cli-interface`: add canonical navigation leaves and remove legacy context-open commands.
- `host-bridge-agent-surfaces`: regenerate complete navigation command contracts and preserve governed semantic ownership.

## Impact

The change affects the Broker, Workflow Host projection, Host Bridge registry/server, MCP protocol/server, Rust CLI argument and command layers, native Zotero window/Library/Reader adapters, and their existing tests. It also updates the Broker/Host Bridge/CLI documentation and generated agent-facing surfaces. It depends on the archived canonical read and workflow-selection changes, uses the fixed Zotero 7.0.32, 9.0.6, and 10.0.1 references, adds no dependencies, and does not prepare or publish a release.
