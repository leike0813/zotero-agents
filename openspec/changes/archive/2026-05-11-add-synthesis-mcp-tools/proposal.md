# Add Synthesis MCP Tools

## Why

The `synthesize-topic` workflow needs job-time host capabilities that an ACP
Skills agent can call without a multi-step UI wizard. These tools must reuse the
existing embedded Zotero MCP protocol and expose bounded DTOs rather than raw
Zotero objects.

## What Changes

- Add job-time Synthesis MCP tools for topic context, schemas, library index,
  resolver validation/execution, Paper Registry reads, Citation Graph queries,
  artifact manifests, and batched artifact reads.
- Add an injectable Synthesis service boundary to the existing MCP protocol so
  tests and later host wiring can provide deterministic DTOs.
- Keep Synthesis MCP tools read-only; formal writes remain out of scope and must
  later go through workflow result bundles and applyResult.
- Exclude ACP Skills workflow packaging, result persistence, and UI from this
  change.

## Capabilities

### New Capabilities

- `synthesis-mcp-tools`: Job-time read-only Synthesis MCP tools exposed through
  the existing embedded Zotero MCP protocol.

### Modified Capabilities

- `zotero-mcp-tool-suite`: adds Synthesis job-time read tools while preserving
  existing Zotero MCP queueing, JSON-RPC, and structured result behavior.

## Impact

- Updates `src/modules/zoteroMcpProtocol.ts`.
- Adds Synthesis service DTO contracts under `src/modules/synthesis/`.
- Adds core MCP protocol tests for tools/list, schema retrieval, resolver
  validation/execution, registry/graph reads, and no write tools.
