# Proposal

## Why

Topic list and exact source-reference lookup do not find Topics by the text in their canonical structured content. Add a bounded lexical search owned by the existing Synthesis Topic application so callers can find a Topic and then read its canonical context through the established API.

## What Changes

- Add `topics.search` to Synthesis and explicitly project it as `host.synthesis.topics.search`.
- Expose the same Topic search through the existing `topics.search` Host Bridge capability, its mirrored MCP tool, and `zotero-bridge synthesis topic search` CLI command.
- Search the current Synthesis data root's canonical Topics, optionally limited to canonical section names; return one ranked result per Topic with matching sections and concise match explanations.
- Define shared search result metadata, cursor failure semantics, Unicode lexical matching, and bounded request behavior for this entry point.
- Keep Topic enumeration, source-reference association, resolver behavior, report/context reads, and freshness projections under their existing contracts.
- Correct the structured Topic section inventory so the optional canonical `comparison_matrix` is recognized for search without becoming mandatory in newly authored artifacts.

## Capabilities

### New Capabilities

- `synthesis-topic-lexical-search`: Bounded lexical search over canonical Topic definitions and structured content.

### Modified Capabilities

- `synthesis-sidecar-topic-application-foundation`: Add a bounded search operation to the existing Topic application owner.
- `synthesis-client-contracts`: Expose the typed Synthesis `topics.search` member.
- `synthesis-topic-structured-artifact-engine`: Recognize optional canonical `comparison_matrix` in complete section and patch inventories without requiring it in new artifacts.
- `workflow-host-api-v12`: Explicitly project Topic search and existing Topic context reads through the Workflow Host.
- `host-bridge-service`: Expose Topic search as a bounded read capability with the shared search result contract.
- `host-bridge-agent-surfaces`: Keep the generated CLI, Generic, and Hermes surfaces aligned with the added command while preserving all existing semantic units.
- `host-bridge-cli-synthesis-subcommands`: Add the Topic search CLI command and preserve the JSON `--query` container.
- `zotero-mcp-tool-suite`: Mirror the new Topic search capability through the existing Host Bridge registry.

## Impact

The implementation will extend the Topic search DTOs and grouped client port, native adapter, current Rust Topic application and runtime route, explicit Workflow Host projection, Host Bridge capability registry, MCP mirror, and Rust CLI. It will update the affected protocol/schema contracts and Topic search documentation, and extend existing Synthesis, Host Bridge, MCP, and CLI behavior tests. Host Bridge materialized surface review will use baseline commit `84b3028dba8f5f3b8437f3aa237bf0fec2e68820`; the semantic deletion list is empty. Library item search, evidence search, Topic graph behavior, and embedding/vector implementation remain outside this change.
