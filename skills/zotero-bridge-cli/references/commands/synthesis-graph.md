# Synthesis Graph

Load this manual only after the task has been routed to this domain. Each card combines exact CLI/backend facts with task-selection and evidence guidance.

## `zotero-bridge synthesis graph get-layout`

Read persisted citation graph layout coordinates

### Backend and freshness

- Targets: `capability:citation_graph.get_layout`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis graph get-layout when the required operation is: Read persisted citation graph layout coordinates.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis graph get-layout when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis graph get-layout`.
- Example: `zotero-bridge synthesis graph get-layout`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `query` → option `--query` (optional, takes a value).
- CLI invocation fields:
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from citation_graph.get_layout.
- Completion evidence:
- The structured synthesis graph get-layout result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis graph get-metrics`

Read citation graph metrics for selected papers

### Backend and freshness

- Targets: `capability:citation_graph.get_metrics`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis graph get-metrics when the required operation is: Read citation graph metrics for selected papers.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis graph get-metrics when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis graph get-metrics`.
- Example: `zotero-bridge synthesis graph get-metrics`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `query` → option `--query` (optional, takes a value).
- CLI invocation fields:
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `paperRefs` (array)
- `paper_refs` (array)
- `cursor` (number | string)
- `limit` (number | string)
- `sortBy` (string)
- `sort_by` (string)

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from citation_graph.get_metrics.
- `graph` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured synthesis graph get-metrics result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis graph get-slice`

Read a Synthesis citation graph slice

### Backend and freshness

- Targets: `capability:citation_graph.get_slice`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis graph get-slice when the required operation is: Read a Synthesis citation graph slice.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis graph get-slice when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis graph get-slice`.
- Example: `zotero-bridge synthesis graph get-slice`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `query` → option `--query` (optional, takes a value).
- CLI invocation fields:
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from citation_graph.get_slice.
- Completion evidence:
- The structured synthesis graph get-slice result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis graph overview`

Read a paged Synthesis citation graph overview

### Backend and freshness

- Targets: `capability:citation_graph.get_overview`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis graph overview when the required operation is: Read a paged Synthesis citation graph overview.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis graph overview when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis graph overview`.
- Example: `zotero-bridge synthesis graph overview`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `query` → option `--query` (optional, takes a value).
- CLI invocation fields:
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `cursor` (number | string)
- `limit` (number | string)
- `nodeCursor` (number | string)
- `node_cursor` (number | string)
- `nodeLimit` (number | string)
- `node_limit` (number | string)
- `edgeCursor` (number | string)
- `edge_cursor` (number | string)
- `edgeLimit` (number | string)
- `edge_limit` (number | string)
- `hoverNodeCursor` (number | string)
- `hover_node_cursor` (number | string)
- `hoverNodeLimit` (number | string)
- `hover_node_limit` (number | string)
- `hoverEdgeCursor` (number | string)
- `hover_edge_cursor` (number | string)
- `hoverEdgeLimit` (number | string)
- `hover_edge_limit` (number | string)

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from citation_graph.get_overview.
- `graph` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured synthesis graph overview result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis graph query-cluster`

Query a topic-scoped citation graph cluster

### Backend and freshness

- Targets: `capability:citation_graph.query_cluster`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis graph query-cluster when the required operation is: Query a topic-scoped citation graph cluster.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis graph query-cluster when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis graph query-cluster`.
- Example: `zotero-bridge synthesis graph query-cluster`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `query` → option `--query` (optional, takes a value).
- CLI invocation fields:
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `source_paper_refs` (array)
- `sourcePaperRefs` (array)
- `paper_refs` (array)
- `paperRefs` (array)
- `paper_ref` (string)
- `paperRef` (string)
- `max_external_nodes` (number | string)
- `maxExternalNodes` (number | string)
- `max_nodes` (number | string)
- `maxNodes` (number | string)
- `max_edges` (number | string)
- `maxEdges` (number | string)
- `cluster_policy` (string)
- `clusterPolicy` (string)

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from citation_graph.query_cluster.
- Completion evidence:
- The structured synthesis graph query-cluster result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis graph rank-external-references`

Rank external references from the citation graph

### Backend and freshness

- Targets: `capability:citation_graph.rank_external_references`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis graph rank-external-references when the required operation is: Rank external references from the citation graph.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis graph rank-external-references when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis graph rank-external-references`.
- Example: `zotero-bridge synthesis graph rank-external-references`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `query` → option `--query` (optional, takes a value).
- CLI invocation fields:
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `cursor` (number | string)
- `limit` (number | string)
- `sortBy` (string)
- `sort_by` (string)

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from citation_graph.rank_external_references.
- `graph` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured synthesis graph rank-external-references result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis graph rank-library-papers`

Rank library papers from citation graph metrics

### Backend and freshness

- Targets: `capability:citation_graph.rank_library_papers`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis graph rank-library-papers when the required operation is: Rank library papers from citation graph metrics.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis graph rank-library-papers when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis graph rank-library-papers`.
- Example: `zotero-bridge synthesis graph rank-library-papers`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `query` → option `--query` (optional, takes a value).
- CLI invocation fields:
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `paperRefs` (array)
- `paper_refs` (array)
- `cursor` (number | string)
- `limit` (number | string)
- `sortBy` (string)
- `sort_by` (string)

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from citation_graph.rank_library_papers.
- `graph` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured synthesis graph rank-library-papers result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis graph refresh-metrics`

Refresh persisted citation graph complex metrics

### Backend and freshness

- Targets: `capability:citation_graph.refresh_metrics`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis graph refresh-metrics when the required operation is: Refresh persisted citation graph complex metrics.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis graph refresh-metrics when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis graph refresh-metrics`.
- Example: `zotero-bridge synthesis graph refresh-metrics`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `input` → option `--input` (optional, takes a value).
- CLI invocation fields:
- `input` (string): Host Bridge capability input as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `input` (string): Host Bridge capability input as inline JSON, a file path, @file, or '-' for stdin

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from citation_graph.refresh_metrics.
- Completion evidence:
- The structured synthesis graph refresh-metrics result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `zotero-ui-required` at `before-command`; Zotero UI approval for the described Host-owned effect.
- Effect `graph-metrics-maintenance`: May change graph metrics maintenance state. stateChanged=true.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.
