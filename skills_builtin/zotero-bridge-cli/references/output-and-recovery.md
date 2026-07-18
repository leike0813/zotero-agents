# Output And Error Contract

The embedded command contract uses `host-bridge.agent-surface.v2` and `zotero-bridge.cli.v2`.

Successful commands emit one JSON envelope with `ok`, `data`, and `meta`. Interpret `data` through the command-specific `resultSchema`; similarly named ids are not interchangeable handles.

Retry only when `retryable` is true. Query current state before repeating an operation when `stateChanged` is true, and never reuse a consumed handle.

## Failure decision matrix

| retryable | stateChanged | handleConsumed | Safe response |
| --- | --- | --- | --- |
| true | false | false | Recheck connectivity, then retry the same bounded command. |
| false | false | false | Correct input, authorization, or capability choice before a new invocation. |
| any | true | false | Query the command-specific current-state endpoint before deciding whether another write is needed. |
| any | any | true | Do not reuse the handle; inspect its receipt/status and create a new operation only when allowed. |

## Partial apply-back

For `workflow agent-apply`, preflight all bundles before approval. If execution reports mixed outcomes, keep `agentRunId`, run `workflow agent-apply-status`, and use the receipt as the authority for applied, failed, and recoverable requests.

## File and paging recovery

Persist the last accepted page and resume from `nextCursor` without merging a page twice. Verify file checksum and byte count before use. A local path, `fileId`, `productId`, and workflow artifact are different objects.

For remote delivery, follow the returned `delivery.mode`, execute its `downloadCommand` with the opaque `fileId`, and honor `unpackHint`. A Host-local path in the envelope is not readable by the remote agent.
