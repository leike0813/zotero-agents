# Synthesis Index Resolver Insights

Load this manual only after the task has been routed to this domain. Each card combines exact CLI/backend facts with task-selection and evidence guidance.

## `zotero-bridge synthesis cache invalidate`

Invalidate a constrained Synthesis cache scope

### Backend and freshness

- Targets: `endpoint:POST /bridge/v1/synthesis/cache/invalidate`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis cache invalidate when the required operation is: Invalidate a constrained Synthesis cache scope.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.
- Read-only cache status shows stale derived data and the user can review the maintenance action.

Avoid when:
- Do not use synthesis cache invalidate when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis cache invalidate`.
- Example: `zotero-bridge synthesis cache invalidate --scope 'scope'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `scope` → option `--scope` (required, takes a value).
- `id` → option `--id` (optional, takes a value).
- CLI invocation fields:
- `scope` (string): Cache scope
- `id` (string): Optional opaque target id
- Decoded payload fields:
- `scope` (string): Cache scope
- `id` (string): Optional opaque target id

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from POST /bridge/v1/synthesis/cache/invalidate.
- Completion evidence:
- The structured synthesis cache invalidate result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata
- pre-invalidation status, approval outcome, and post-invalidation status

### Approval, effects, and handles

- Approval: `zotero-ui-required` at `before-command`; Zotero UI approval for the described Host-owned effect.
- Effect `cache-maintenance`: May change cache maintenance state. stateChanged=true.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis cache status`

Read Synthesis cache maintenance status

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/synthesis/cache/status`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis cache status when the required operation is: Read Synthesis cache maintenance status.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis cache status when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis cache status`.
- Example: `zotero-bridge synthesis cache status`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- No command arguments.
- CLI invocation fields:
- No structured fields.
- Decoded payload fields:
- No structured fields.

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/synthesis/cache/status.
- Completion evidence:
- The structured synthesis cache status result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis index library get`

Read an index page

### Backend and freshness

- Targets: `capability:library_index.get`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis index library get when the required operation is: Read an index page.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis index library get when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis index library get`.
- Example: `zotero-bridge synthesis index library get`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `query` → option `--query` (optional, takes a value).
- CLI invocation fields:
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `libraryId` (number | string)
- `cursor` (number | string)
- `limit` (number | string)
- `includeTags` (boolean)
- `includeCollections` (boolean)
- `includeItems` (boolean)
- `tagCursor` (number | string)
- `tagLimit` (number | string)
- `collectionCursor` (number | string)
- `collectionLimit` (number | string)
- `topicCursor` (number | string)
- `topicLimit` (number | string)
- `registryCursor` (number | string)
- `registryLimit` (number | string)

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from library_index.get.
- `entries` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured synthesis index library get result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis index reference get`

Read an index page

### Backend and freshness

- Targets: `capability:reference_index.get`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis index reference get when the required operation is: Read an index page.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis index reference get when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis index reference get`.
- Example: `zotero-bridge synthesis index reference get`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `query` → option `--query` (optional, takes a value).
- CLI invocation fields:
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from reference_index.get.
- `entries` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured synthesis index reference get result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis index status`

Read Synthesis index maintenance status

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/synthesis/index/status`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis index status when the required operation is: Read Synthesis index maintenance status.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis index status when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis index status`.
- Example: `zotero-bridge synthesis index status`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- No command arguments.
- CLI invocation fields:
- No structured fields.
- Decoded payload fields:
- No structured fields.

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/synthesis/index/status.
- Completion evidence:
- The structured synthesis index status result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis insight attention-queue`

Read aggregate graph/artifact/reference attention items

### Backend and freshness

- Targets: `capability:insights.get_attention_queue`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis insight attention-queue when the required operation is: Read aggregate graph/artifact/reference attention items.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis insight attention-queue when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis insight attention-queue`.
- Example: `zotero-bridge synthesis insight attention-queue`.
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
- `result` (object): Stable result from insights.get_attention_queue.
- Completion evidence:
- The structured synthesis insight attention-queue result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis resolver resolve`

Resolve a topic resolver into a paper set

### Backend and freshness

- Targets: `capability:resolvers.resolve`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis resolver resolve when the required operation is: Resolve a topic resolver into a paper set.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis resolver resolve when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.
- Do not wrap selectors in a resolver object or use resolver output as live Zotero selection.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis resolver resolve`.
- Example: `zotero-bridge synthesis resolver resolve --query '{"tag":{"and":["object-detection"],"not":["nlp"]},"collection_key":["COLL_A"],"paper_refs":["1:ABCD1234"],"combine":"intersection"}'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `query` → option `--query` (optional, takes a value).
- CLI invocation fields:
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `tag` (string | array | object)
- `collection_key` (string | array)
- `paper_refs` (array)
- `combine` (object)

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from resolvers.resolve.
- `items` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured synthesis resolver resolve result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.
