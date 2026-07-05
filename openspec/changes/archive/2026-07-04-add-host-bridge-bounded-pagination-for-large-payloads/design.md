# Design

## Response Sizing Contract

Public non-debug read capabilities that can grow with library or graph size must
be classified as one of:

- `paged`: returns one page and cursor metadata.
- `limit-bounded`: returns at most a documented bounded set.
- `selector-bounded`: requires explicit object or workset selectors.
- `file-output`: materializes large content outside stdout and returns a compact
  envelope.
- `bounded-diagnostic`: returns fixed diagnostic metadata.

The surface catalog records this classification and checks the known
high-cardinality read surface.

## Citation Graph Overview

`citation_graph.get_overview` keeps its capability and CLI names. Its response
keeps graph summary data, `graph_hash`, diagnostics, and maintenance metadata,
but `nodes`, `edges`, `hover_only_nodes`, and `hover_only_edges` are page-sized
arrays. The response includes section-level `pagination` entries for each
array. Callers that need the full overview must iterate each section cursor.

`citation_graph.query_cluster` may read the full cached graph internally to
compute a selected cluster, but the returned node and edge arrays are bounded
and include truncation diagnostics.

## Other High-Cardinality Reads

`topics.list`, graph metrics, graph rankings, and library index attached
sections expose cursor metadata. Existing library list, snapshot, readiness,
reference index, and resolver pagination remains the model for response shape.

## CLI and Semantic Guidance

The CLI remains a one-page invocation model: each command prints one complete
JSON object. Wrapper and profile guidance instruct agents to page through
cursor metadata and to prefer graph slice/layout/metrics commands when a
coherent bounded graph view is needed.
