# Output And Error Contract

The embedded command contract uses `host-bridge.agent-surface.v3` and `zotero-bridge.cli.v3`.

Successful commands emit one JSON envelope with `ok`, `data`, and `meta`. Interpret `data` through the command-specific `resultSchema`; similarly named ids are not interchangeable handles.

Retry only when `retryable` is true. For state-changing commands, use `operation get <operationId>` when `stateChange` or `handleConsumption` is `unknown`; never infer safety from HTTP status alone.

## Failure decision matrix

| retryable | stateChange | handleConsumption | Safe response |
| --- | --- | --- | --- |
| true | unchanged | unconsumed | Recheck connectivity, then retry the same bounded command. |
| false | unchanged | unconsumed | Correct input, authorization, or capability choice before a new invocation. |
| any | changed | unconsumed | Query the command-specific current-state endpoint before deciding whether another write is needed. |
| any | any | consumed | Do not reuse the handle; inspect its receipt/status and create a new operation only when allowed. |
| any | unknown | unknown | Read the durable operation receipt before deciding whether retry is safe. |

## Partial apply-back

For `workflow agent-apply`, preflight all bundles before approval. If execution reports mixed outcomes, keep `agentRunId`, run `workflow agent-apply-status`, and use the receipt as the authority for applied, failed, and recoverable requests.

## File and paging recovery

Persist the last accepted page and resume from `nextCursor` without merging a page twice. Verify file checksum and byte count before use. A local path, `fileId`, `productId`, and workflow artifact are different objects.

For remote delivery, follow the returned `delivery.mode`, execute its `downloadCommand` with the opaque `fileId`, and honor `unpackHint`. A Host-local path in the envelope is not readable by the remote agent.
