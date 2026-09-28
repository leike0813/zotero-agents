# Design

## Context

C03 has a single encrypted Pi credential document, C07 freezes Gateway definitions and controls receipts, and C09 provides cross-platform long-lived stdio. The current Backend Manager is a Preact page under `src/dashboard`; the issue's old handwritten JS path and `test/core` path are stale.

## Goals / Non-Goals

**Goals:** One source registry, one outbound runtime owner, one C09-backed stdio transport, and reviewed Gateway projection.

**Non-Goals:** OAuth, non-tool MCP features, standalone SSE, catalog persistence, a second client framework, or inbound MCP changes.

## Decisions

- Add a `mcp-source` namespace to C03's credential document. Records without a namespace remain `model-provider` and retain their existing encryption associated data. Source reads require the expected namespace.
- Store one versioned registry preference. It contains only configuration and reviewed descriptor digests; live catalogs and connection-test results remain in memory. Explicit import accepts the common `mcpServers` map, previews literal secret slots, and rejects executable resolvers or ambient expansion.
- Use the official v2 browser client for Streamable HTTP. HTTP fetch applies manual redirect handling, origin and credential checks. Stdio adapts C09's byte streams to the official Transport interface and keeps stderr separate.
- `getCatalogForTurn` resolves selected reviewed tools from a live or unexpired in-memory discovery snapshot. A fixed proxy closes over that immutable snapshot. C07 includes its hidden-catalog digest in catalog identity; classification resolves the call target before permission and scheduling.
- One normalization function validates and bounds the complete MCP call result before C07 sees it. Source shutdown precedes C09 broker shutdown.
- Use existing runtime, dashboard, host-bridge and real Zotero test infrastructure. The absent `test:node:core` script is represented by existing targeted shards plus `npm run test:node`.

## Risks / Trade-offs

- SDK browser import may pull Node shims → strict browser bundle check and real Zotero canary.
- Stdio termination or network loss may leave effects unknown → no automatic call replay and Gateway uncertainty receipt.
- Existing full suites have known unrelated blockers → run them, record exact evidence, and obtain a candidate-specific exception before archive if needed.

## Migration Plan

The credential reader treats existing records without a namespace as `model-provider`; no destructive rewrite is needed. The v1 SDK test helper migrates to v2 in the same dependency update.
