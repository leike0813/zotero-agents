# Upgrade Host Bridge Namespaces and Insights

## Why

The Host Bridge public surface currently concentrates unrelated topic, graph,
artifact, resolver, and cache views under `synthesis.*`. This makes CLI/MCP
discovery ambiguous and leaves common user intents, such as ranking important
external references, without a one-hop entry.

## What Changes

- Hard-cut public Host Bridge capability names from `synthesis.*` to
  domain-specific namespaces.
- Split the CLI `synthesis` command into topic, graph, artifact, resolver,
  index, concept, schema, and insight command families.
- Add read-only insight facade capabilities for ranked external references,
  ranked library papers, and the attention queue.
- Update MCP mirror, wrapper skill reference, and drift checks to expose only
  the new names.

## Impact

- Breaking change: old `synthesis.*` Host Bridge/MCP tool names are unavailable.
- No change to Host Bridge HTTP request shape, token/profile shape, approval
  routing, or file download rules.
