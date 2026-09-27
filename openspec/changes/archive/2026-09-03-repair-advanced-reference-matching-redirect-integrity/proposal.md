## Why

Reference projection replacement can delete Canonical References that are still required by durable redirects and revision reviews. This leaves an invalid redirect graph, causes Advanced Reference Matching to fail before worker dispatch with `worker_result_invalid`, and can be obscured in the Dashboard by a trace row that reports only the successful asynchronous admission.

## What Changes

- Preserve Canonical References referenced by redirects and persisted revision reviews during projection replacement.
- Repair existing redirect-graph data with a backup-backed, transactional schema migration before production reads.
- Keep the successful `pending` admission event while deriving the trace row outcome from the complete trace, including its durable maintenance terminal.
- Retain the existing public maintenance receipt and error-code contract.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-reference-sidecar-citation-graph`: require production schema preparation to repair redirect components that cannot resolve to an existing Canonical Reference, and preserve Canonical References needed by durable Reference facts.
- `synthesis-sidecar-operation-observability`: require a completed trace summary to reflect a correlated durable failure even when the initial asynchronous admission succeeded.

## Impact

- Affects the Synthesis repository's Reference projection replacement and redirect-graph schema preparation.
- Affects the Dashboard trace-row projection only; raw observation events are unchanged.
- Introduces no public API, dependency, or wire-format change.
