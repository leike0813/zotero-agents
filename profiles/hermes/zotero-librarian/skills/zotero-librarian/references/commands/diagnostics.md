# Diagnostics

Load this manual only after the task has been routed to this domain. Each card combines exact CLI/backend facts with task-selection and evidence guidance.

## `zotero-bridge call`

Advanced diagnostic raw capability call

### Backend and freshness

- Targets: `service:POST /bridge/v1/call`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use call when the required operation is: Advanced diagnostic raw capability call.
- The manifest exposes a raw-only capability with no semantic command, or explicit diagnostics require it.

Avoid when:
- Do not use call when the task needs a different sibling result, control plane, or freshness guarantee.
- Never use raw call to bypass a semantic command, approval, or validation contract.

Distinguish from:
- No semantic sibling exists; use surface search before falling back to a raw capability call.

### Invocation and payload

- Canonical argv: `zotero-bridge call`.
- Example: `zotero-bridge call 'capability'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `capability` → positional 1 as `CAPABILITY` (required, takes a value).
- `input` → option `--input` (optional, takes a value).
- CLI invocation fields:
- `capability` (string): Capability name, for example library.get_item_detail
- `input` (string): Capability input as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `capability` (string): Capability name, for example library.get_item_detail
- `input` (string): Capability input as inline JSON, a file path, @file, or '-' for stdin

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from POST /bridge/v1/call.
- Completion evidence:
- The structured call result and the exact invocation inputs used to obtain it.
- capability name, approval metadata, and returned data

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge debug acp-skill-run reapply-result`

Re-run applyResult for one existing ACP skill run result

### Backend and freshness

- Targets: `capability:debug.acpSkillRun.reapplyResult`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use debug acp-skill-run reapply-result when the required operation is: Re-run applyResult for one existing ACP skill run result.
- Ordinary bridge, library, run, cache, and index diagnostics did not explain the problem.

Avoid when:
- Do not use debug acp-skill-run reapply-result when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use debug commands for ordinary task routing or as a bypass around semantic commands.

Distinguish from:
- debug persistence: choose it only when its narrower result matches the task.
- debug status: choose it only when its narrower result matches the task.
- debug synthesis cache: choose it only when its narrower result matches the task.
- debug synthesis clean-install-reset: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge debug acp-skill-run reapply-result`.
- Example: `zotero-bridge debug acp-skill-run reapply-result`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `input` → option `--input` (optional, takes a value).
- CLI invocation fields:
- `input` (string): Debug capability input as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `input` (string): Debug capability input as inline JSON, a file path, @file, or '-' for stdin

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from debug.acpSkillRun.reapplyResult.
- Completion evidence:
- The structured debug acp-skill-run reapply-result result and the exact invocation inputs used to obtain it.
- bounded diagnostic snapshot and any required approval result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `debug-repair`: May change debug repair state. stateChanged=true.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge debug persistence`

Read debug-only persistence diagnostics

### Backend and freshness

- Targets: `capability:debug.persistence.snapshot`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use debug persistence when the required operation is: Read debug-only persistence diagnostics.
- Ordinary bridge, library, run, cache, and index diagnostics did not explain the problem.

Avoid when:
- Do not use debug persistence when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use debug commands for ordinary task routing or as a bypass around semantic commands.

Distinguish from:
- debug acp-skill-run reapply-result: choose it only when its narrower result matches the task.
- debug status: choose it only when its narrower result matches the task.
- debug synthesis cache: choose it only when its narrower result matches the task.
- debug synthesis clean-install-reset: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge debug persistence`.
- Example: `zotero-bridge debug persistence`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `input` → option `--input` (optional, takes a value).
- CLI invocation fields:
- `input` (string): Debug capability input as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `input` (string): Debug capability input as inline JSON, a file path, @file, or '-' for stdin

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from debug.persistence.snapshot.
- Completion evidence:
- The structured debug persistence result and the exact invocation inputs used to obtain it.
- bounded diagnostic snapshot and any required approval result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge debug status`

Read debug-only Host Bridge runtime status

### Backend and freshness

- Targets: `capability:debug.status`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use debug status when the required operation is: Read debug-only Host Bridge runtime status.
- Ordinary bridge, library, run, cache, and index diagnostics did not explain the problem.

Avoid when:
- Do not use debug status when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use debug commands for ordinary task routing or as a bypass around semantic commands.

Distinguish from:
- debug acp-skill-run reapply-result: choose it only when its narrower result matches the task.
- debug persistence: choose it only when its narrower result matches the task.
- debug synthesis cache: choose it only when its narrower result matches the task.
- debug synthesis clean-install-reset: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge debug status`.
- Example: `zotero-bridge debug status`.
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
- `result` (object): Stable result from debug.status.
- Completion evidence:
- The structured debug status result and the exact invocation inputs used to obtain it.
- bounded diagnostic snapshot and any required approval result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge debug synthesis cache`

List debug-only Synthesis sidecar cache basis rows

### Backend and freshness

- Targets: `capability:debug.synthesis.cache.list`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use debug synthesis cache when the required operation is: List debug-only Synthesis sidecar cache basis rows.
- Ordinary bridge, library, run, cache, and index diagnostics did not explain the problem.

Avoid when:
- Do not use debug synthesis cache when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use debug commands for ordinary task routing or as a bypass around semantic commands.

Distinguish from:
- debug acp-skill-run reapply-result: choose it only when its narrower result matches the task.
- debug persistence: choose it only when its narrower result matches the task.
- debug status: choose it only when its narrower result matches the task.
- debug synthesis clean-install-reset: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge debug synthesis cache`.
- Example: `zotero-bridge debug synthesis cache`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `input` → option `--input` (optional, takes a value).
- CLI invocation fields:
- `input` (string): Debug capability input as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `input` (string): Debug capability input as inline JSON, a file path, @file, or '-' for stdin

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from debug.synthesis.cache.list.
- Completion evidence:
- The structured debug synthesis cache result and the exact invocation inputs used to obtain it.
- bounded diagnostic snapshot and any required approval result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge debug synthesis clean-install-reset`

Dangerous debug operation: reset Synthesis install state

### Backend and freshness

- Targets: `capability:debug.synthesis.cleanInstallReset`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use debug synthesis clean-install-reset when the required operation is: Dangerous debug operation: reset Synthesis install state.
- Ordinary bridge, library, run, cache, and index diagnostics did not explain the problem.

Avoid when:
- Do not use debug synthesis clean-install-reset when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use debug commands for ordinary task routing or as a bypass around semantic commands.

Distinguish from:
- debug acp-skill-run reapply-result: choose it only when its narrower result matches the task.
- debug persistence: choose it only when its narrower result matches the task.
- debug status: choose it only when its narrower result matches the task.
- debug synthesis cache: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge debug synthesis clean-install-reset`.
- Example: `zotero-bridge debug synthesis clean-install-reset`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `input` → option `--input` (optional, takes a value).
- CLI invocation fields:
- `input` (string): Debug capability input as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `input` (string): Debug capability input as inline JSON, a file path, @file, or '-' for stdin

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from debug.synthesis.cleanInstallReset.
- Completion evidence:
- The structured debug synthesis clean-install-reset result and the exact invocation inputs used to obtain it.
- bounded diagnostic snapshot and any required approval result

### Approval, effects, and handles

- Approval: `zotero-ui-required` at `before-command`; Zotero UI approval for the described Host-owned effect.
- Effect `debug-repair`: May change debug repair state. stateChanged=true.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge debug synthesis diff`

Read debug-only Synthesis DB/cache differences

### Backend and freshness

- Targets: `capability:debug.synthesis.diff`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use debug synthesis diff when the required operation is: Read debug-only Synthesis DB/cache differences.
- Ordinary bridge, library, run, cache, and index diagnostics did not explain the problem.

Avoid when:
- Do not use debug synthesis diff when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use debug commands for ordinary task routing or as a bypass around semantic commands.

Distinguish from:
- debug acp-skill-run reapply-result: choose it only when its narrower result matches the task.
- debug persistence: choose it only when its narrower result matches the task.
- debug status: choose it only when its narrower result matches the task.
- debug synthesis cache: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge debug synthesis diff`.
- Example: `zotero-bridge debug synthesis diff`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `input` → option `--input` (optional, takes a value).
- CLI invocation fields:
- `input` (string): Debug capability input as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `input` (string): Debug capability input as inline JSON, a file path, @file, or '-' for stdin

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from debug.synthesis.diff.
- Completion evidence:
- The structured debug synthesis diff result and the exact invocation inputs used to obtain it.
- bounded diagnostic snapshot and any required approval result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge debug synthesis inspect-paper`

Inspect one debug Synthesis paper

### Backend and freshness

- Targets: `capability:debug.synthesis.paper.inspect`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use debug synthesis inspect-paper when the required operation is: Inspect one debug Synthesis paper.
- Ordinary bridge, library, run, cache, and index diagnostics did not explain the problem.

Avoid when:
- Do not use debug synthesis inspect-paper when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use debug commands for ordinary task routing or as a bypass around semantic commands.

Distinguish from:
- debug acp-skill-run reapply-result: choose it only when its narrower result matches the task.
- debug persistence: choose it only when its narrower result matches the task.
- debug status: choose it only when its narrower result matches the task.
- debug synthesis cache: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge debug synthesis inspect-paper`.
- Example: `zotero-bridge debug synthesis inspect-paper`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `input` → option `--input` (optional, takes a value).
- CLI invocation fields:
- `input` (string): Debug capability input as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `input` (string): Debug capability input as inline JSON, a file path, @file, or '-' for stdin

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from debug.synthesis.paper.inspect.
- Completion evidence:
- The structured debug synthesis inspect-paper result and the exact invocation inputs used to obtain it.
- bounded diagnostic snapshot and any required approval result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge debug synthesis inspect-topic`

Inspect one debug Synthesis topic

### Backend and freshness

- Targets: `capability:debug.synthesis.topic.inspect`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use debug synthesis inspect-topic when the required operation is: Inspect one debug Synthesis topic.
- Ordinary bridge, library, run, cache, and index diagnostics did not explain the problem.

Avoid when:
- Do not use debug synthesis inspect-topic when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use debug commands for ordinary task routing or as a bypass around semantic commands.

Distinguish from:
- debug acp-skill-run reapply-result: choose it only when its narrower result matches the task.
- debug persistence: choose it only when its narrower result matches the task.
- debug status: choose it only when its narrower result matches the task.
- debug synthesis cache: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge debug synthesis inspect-topic`.
- Example: `zotero-bridge debug synthesis inspect-topic`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `input` → option `--input` (optional, takes a value).
- CLI invocation fields:
- `input` (string): Debug capability input as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `input` (string): Debug capability input as inline JSON, a file path, @file, or '-' for stdin

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from debug.synthesis.topic.inspect.
- Completion evidence:
- The structured debug synthesis inspect-topic result and the exact invocation inputs used to obtain it.
- bounded diagnostic snapshot and any required approval result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge debug synthesis operations`

List debug-only Synthesis explicit operations

### Backend and freshness

- Targets: `capability:debug.synthesis.operations.list`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use debug synthesis operations when the required operation is: List debug-only Synthesis explicit operations.
- Ordinary bridge, library, run, cache, and index diagnostics did not explain the problem.

Avoid when:
- Do not use debug synthesis operations when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use debug commands for ordinary task routing or as a bypass around semantic commands.

Distinguish from:
- debug acp-skill-run reapply-result: choose it only when its narrower result matches the task.
- debug persistence: choose it only when its narrower result matches the task.
- debug status: choose it only when its narrower result matches the task.
- debug synthesis cache: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge debug synthesis operations`.
- Example: `zotero-bridge debug synthesis operations`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `input` → option `--input` (optional, takes a value).
- CLI invocation fields:
- `input` (string): Debug capability input as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `input` (string): Debug capability input as inline JSON, a file path, @file, or '-' for stdin

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from debug.synthesis.operations.list.
- Completion evidence:
- The structured debug synthesis operations result and the exact invocation inputs used to obtain it.
- bounded diagnostic snapshot and any required approval result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge debug synthesis profiler`

List debug-only Synthesis profiler timings

### Backend and freshness

- Targets: `capability:debug.synthesis.profiler.list`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use debug synthesis profiler when the required operation is: List debug-only Synthesis profiler timings.
- Ordinary bridge, library, run, cache, and index diagnostics did not explain the problem.

Avoid when:
- Do not use debug synthesis profiler when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use debug commands for ordinary task routing or as a bypass around semantic commands.

Distinguish from:
- debug acp-skill-run reapply-result: choose it only when its narrower result matches the task.
- debug persistence: choose it only when its narrower result matches the task.
- debug status: choose it only when its narrower result matches the task.
- debug synthesis cache: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge debug synthesis profiler`.
- Example: `zotero-bridge debug synthesis profiler`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `input` → option `--input` (optional, takes a value).
- CLI invocation fields:
- `input` (string): Debug capability input as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `input` (string): Debug capability input as inline JSON, a file path, @file, or '-' for stdin

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from debug.synthesis.profiler.list.
- Completion evidence:
- The structured debug synthesis profiler result and the exact invocation inputs used to obtain it.
- bounded diagnostic snapshot and any required approval result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge debug synthesis snapshot`

Read a debug-only Synthesis snapshot

### Backend and freshness

- Targets: `capability:debug.synthesis.snapshot`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use debug synthesis snapshot when the required operation is: Read a debug-only Synthesis snapshot.
- Ordinary bridge, library, run, cache, and index diagnostics did not explain the problem.

Avoid when:
- Do not use debug synthesis snapshot when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use debug commands for ordinary task routing or as a bypass around semantic commands.

Distinguish from:
- debug acp-skill-run reapply-result: choose it only when its narrower result matches the task.
- debug persistence: choose it only when its narrower result matches the task.
- debug status: choose it only when its narrower result matches the task.
- debug synthesis cache: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge debug synthesis snapshot`.
- Example: `zotero-bridge debug synthesis snapshot`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `input` → option `--input` (optional, takes a value).
- CLI invocation fields:
- `input` (string): Debug capability input as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `input` (string): Debug capability input as inline JSON, a file path, @file, or '-' for stdin

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from debug.synthesis.snapshot.
- Completion evidence:
- The structured debug synthesis snapshot result and the exact invocation inputs used to obtain it.
- bounded diagnostic snapshot and any required approval result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge debug tasks`

Read debug-only workflow task diagnostics

### Backend and freshness

- Targets: `capability:debug.tasks.snapshot`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use debug tasks when the required operation is: Read debug-only workflow task diagnostics.
- Ordinary bridge, library, run, cache, and index diagnostics did not explain the problem.

Avoid when:
- Do not use debug tasks when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use debug commands for ordinary task routing or as a bypass around semantic commands.

Distinguish from:
- debug acp-skill-run reapply-result: choose it only when its narrower result matches the task.
- debug persistence: choose it only when its narrower result matches the task.
- debug status: choose it only when its narrower result matches the task.
- debug synthesis cache: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge debug tasks`.
- Example: `zotero-bridge debug tasks`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `input` → option `--input` (optional, takes a value).
- CLI invocation fields:
- `input` (string): Debug capability input as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `input` (string): Debug capability input as inline JSON, a file path, @file, or '-' for stdin

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from debug.tasks.snapshot.
- Completion evidence:
- The structured debug tasks result and the exact invocation inputs used to obtain it.
- bounded diagnostic snapshot and any required approval result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.
