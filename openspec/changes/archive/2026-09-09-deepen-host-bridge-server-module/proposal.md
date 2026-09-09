## Why

The Host Bridge Server is a deep process-wide module, but its route matching,
HTTP adaptation, admission policy, and five route families currently share one
5,000-line implementation. The duplicated dynamic-route classifier has already
drifted from `/bridge/v2/` to stale `/bridge/v1/` patterns, allowing some direct
state-changing requests to bypass the required generic operation identity.

## What Changes

- Keep the existing Host Bridge Server lifecycle and test interfaces while
  moving private route implementation into five owner-aligned modules.
- Co-locate route matching and admission mode in one private descriptor so the
  server applies generic or canonical admission without a second path list.
- Deepen the existing request-reader and response-writer modules instead of
  adding a general transport abstraction.
- **BREAKING** Require an operation id for direct `/bridge/v2/` agent-run
  apply/renew/abandon, workflow-run cancel, queue cancel, and skill-run
  reply/connect requests. The official CLI already supplies one for every
  non-GET request.
- Correct current Host Bridge specs and lifecycle documentation from stale
  `/bridge/v1/` paths to the implemented `/bridge/v2/` interface.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `host-bridge-operation-receipts`: Require generic operation identity before
  every non-canonical state-changing v2 route executes.
- `host-bridge-service`: Correct the documented Host Bridge route generation.
- `host-bridge-workflow-control`: Correct workflow, task, notification, and
  skill-run route paths to v2.
- `host-bridge-cli-interface`: Correct CLI target route paths to v2.
- `host-bridge-file-downloads`: Correct upload and download route paths to v2.
- `acp-embedded-zotero-mcp-server`: Correct the unified listener's Bridge route
  generation to v2.

## Impact

The change affects the Host Bridge Server's private TypeScript layout, the
existing HTTP and socket behavior tests, the Host Bridge glossary and lifecycle
documentation, and six current OpenSpec capabilities. Public lifecycle exports,
wire DTOs, persistence formats, MCP routing, and CLI build inputs stay
unchanged; no dependency or compatibility forwarding path is added.
