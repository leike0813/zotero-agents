# Synthesis Topics Artifacts

Load this manual only after the task has been routed to this domain. Each card combines exact CLI/backend facts with task-selection and evidence guidance.

## `zotero-bridge synthesis artifact export-filtered`

Export bounded paper artifacts into the run workspace

### Backend and freshness

- Targets: `capability:paper_artifacts.export_filtered`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis artifact export-filtered when the required operation is: Export bounded paper artifacts into the run workspace.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis artifact export-filtered when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.
- synthesis cache invalidate: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis artifact export-filtered`.
- Example: `zotero-bridge synthesis artifact export-filtered`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `query` → option `--query` (optional, takes a value).
- CLI invocation fields:
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin

### Result and evidence

- Delivery: `file`.
- Stable result fields:
- `result` (object): Stable result from paper_artifacts.export_filtered.
- `file` (object)
- `delivery` (object): Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.
- Completion evidence:
- The structured synthesis artifact export-filtered result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis artifact manifest`

Read paper artifact manifest metadata

### Backend and freshness

- Targets: `capability:paper_artifacts.get_manifest`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis artifact manifest when the required operation is: Read paper artifact manifest metadata.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis artifact manifest when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.
- synthesis cache invalidate: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis artifact manifest`.
- Example: `zotero-bridge synthesis artifact manifest`.
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
- `result` (object): Stable result from paper_artifacts.get_manifest.
- Completion evidence:
- The structured synthesis artifact manifest result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis artifact read`

Read selected paper artifacts

### Backend and freshness

- Targets: `capability:paper_artifacts.read`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis artifact read when the required operation is: Read selected paper artifacts.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis artifact read when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.
- synthesis cache invalidate: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis artifact read`.
- Example: `zotero-bridge synthesis artifact read`.
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
- `result` (object): Stable result from paper_artifacts.read.
- Completion evidence:
- The structured synthesis artifact read result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis artifact resolve-topic-digest`

Resolve a topic paper digest

### Backend and freshness

- Targets: `capability:paper_artifacts.resolve_topic_digest`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis artifact resolve-topic-digest when the required operation is: Resolve a topic paper digest.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis artifact resolve-topic-digest when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis cache invalidate: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis artifact resolve-topic-digest`.
- Example: `zotero-bridge synthesis artifact resolve-topic-digest`.
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
- `result` (object): Stable result from paper_artifacts.resolve_topic_digest.
- Completion evidence:
- The structured synthesis artifact resolve-topic-digest result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis concept query`

Query Synthesis Concept KB candidates

### Backend and freshness

- Targets: `capability:concepts.query`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis concept query when the required operation is: Query Synthesis Concept KB candidates.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis concept query when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis concept query`.
- Example: `zotero-bridge synthesis concept query`.
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
- `result` (object): Stable result from concepts.query.
- Completion evidence:
- The structured synthesis concept query result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis schema get`

Read Synthesis Layer schema metadata

### Backend and freshness

- Targets: `capability:schemas.get`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis schema get when the required operation is: Read Synthesis Layer schema metadata.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis schema get when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis schema get`.
- Example: `zotero-bridge synthesis schema get`.
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
- `result` (object): Stable result from schemas.get.
- Completion evidence:
- The structured synthesis schema get result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis topic find-by-paper-ref`

Find active topic synthesis topics by paper_ref

### Backend and freshness

- Targets: `capability:topics.find_by_paper_ref`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis topic find-by-paper-ref when the required operation is: Find active topic synthesis topics by paper_ref.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis topic find-by-paper-ref when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis topic find-by-paper-ref`.
- Example: `zotero-bridge synthesis topic find-by-paper-ref`.
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
- `result` (object): Stable result from topics.find_by_paper_ref.
- Completion evidence:
- The structured synthesis topic find-by-paper-ref result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis topic get-context`

Read one topic synthesis context

### Backend and freshness

- Targets: `capability:topics.get_context`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis topic get-context when the required operation is: Read one topic synthesis context.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis topic get-context when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis topic get-context`.
- Example: `zotero-bridge synthesis topic get-context`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `query` → option `--query` (optional, takes a value).
- CLI invocation fields:
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `topicId` (string)
- `topic_id` (string)
- `view` (string)
- `mode` (string)
- `language` (string)
- `updateScope` (string)
- `update_scope` (string)
- `updateMode` (string)
- `update_mode` (string)
- `updateReason` (string)
- `update_reason` (string)
- `includeFull` (boolean)
- `include_full` (boolean)
- `includeMarkdown` (boolean)
- `include_markdown` (boolean)
- `includeArtifact` (boolean)
- `include_artifact` (boolean)
- `includeManifest` (boolean)
- `include_manifest` (boolean)
- `outputPath` (string)
- `output_path` (string)
- `overwrite` (boolean)

### Result and evidence

- Delivery: `file`.
- Stable result fields:
- `result` (object): Stable result from topics.get_context.
- `file` (object)
- `delivery` (object): Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.
- Completion evidence:
- The structured synthesis topic get-context result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis topic get-report`

Read one topic synthesis report markdown body

### Backend and freshness

- Targets: `capability:topics.get_report`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis topic get-report when the required operation is: Read one topic synthesis report markdown body.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis topic get-report when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis topic get-report`.
- Example: `zotero-bridge synthesis topic get-report`.
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
- `result` (object): Stable result from topics.get_report.
- Completion evidence:
- The structured synthesis topic get-report result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis topic get-review-input`

Read review workflow input from Synthesis

### Backend and freshness

- Targets: `capability:topics.get_review_input`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis topic get-review-input when the required operation is: Read review workflow input from Synthesis.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis topic get-review-input when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis topic get-review-input`.
- Example: `zotero-bridge synthesis topic get-review-input`.
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
- `result` (object): Stable result from topics.get_review_input.
- Completion evidence:
- The structured synthesis topic get-review-input result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge synthesis topic list`

List existing topic synthesis topics

### Backend and freshness

- Targets: `capability:topics.list`.
- Freshness: derived Synthesis state; confirm current Zotero write facts through library/context commands.

### Choose this command

Use when:
- Use synthesis topic list when the required operation is: List existing topic synthesis topics.
- The requested fact belongs to the Synthesis model rather than raw Zotero metadata.

Avoid when:
- Do not use synthesis topic list when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not assume cached Synthesis projections are current Zotero write state.

Distinguish from:
- synthesis artifact export-filtered: choose it only when its narrower result matches the task.
- synthesis artifact manifest: choose it only when its narrower result matches the task.
- synthesis artifact read: choose it only when its narrower result matches the task.
- synthesis artifact resolve-topic-digest: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge synthesis topic list`.
- Example: `zotero-bridge synthesis topic list`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `query` → option `--query` (optional, takes a value).
- CLI invocation fields:
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `cursor` (number | string)
- `limit` (number | string)

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from topics.list.
- `topics` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured synthesis topic list result and the exact invocation inputs used to obtain it.
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.
