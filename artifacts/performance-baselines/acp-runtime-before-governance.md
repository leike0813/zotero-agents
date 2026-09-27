# ACP Runtime CI Mechanism Smoke Matrix

- Schema: `zotero-agents.acp-runtime-governance-baseline.v1`
- Surfaces: `closed`, `open-inactive`, `acp-active`
- Workload: identical deterministic production R1/R2/buffered-write seams; R3 omitted while closed and exercised for both open states
- Environment: Zotero `mock`, plugin `0.6.1`, platform `node-mock`

> This is a repeatable CI mechanism smoke matrix, not a comparable real-workload baseline. It deliberately excludes machine-dependent timing values and does not claim to reproduce Zotero host latency or UI stalls. Comparable governance evidence comes from source-specific replay matrices.

| Surface | Risk | Counters | Bytes | Peak gauge | Duration calls |
| --- | --- | ---: | ---: | ---: | ---: |
| closed | R1 | 1254 | 187643 | 0 | 153 |
| closed | R2 | 2 | 537 | 1 | 2 |
| closed | R3 | 0 | 0 | 0 | 0 |
| open-inactive | R1 | 1255 | 187643 | 0 | 153 |
| open-inactive | R2 | 2 | 537 | 1 | 2 |
| open-inactive | R3 | 5 | 35090 | 0 | 5 |
| acp-active | R1 | 1255 | 187643 | 0 | 153 |
| acp-active | R2 | 2 | 537 | 1 | 2 |
| acp-active | R3 | 5 | 35090 | 0 | 5 |

## closed

- Scenario: `silent-1000-production-seams-closed`
- Completion: `complete`

| Risk | Metric | Labels | Counter | Bytes | Peak gauge | Duration calls |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| R1 | buffered_write_batch | persistenceChannel=transcript | 1 | - | - | - |
| R1 | buffered_write_bytes | persistenceChannel=transcript | - | 64 | - | - |
| R1 | buffered_write_duration | persistenceChannel=transcript | - | - | - | 1 |
| R1 | change_emitted | changeKind=run | 51 | - | - | - |
| R1 | change_emitted | changeKind=transcript | 50 | - | - | - |
| R1 | jsonrpc_message | updateClass=notification | 1000 | - | - | - |
| R1 | run_persist_bytes | persistenceChannel=run | - | 187579 | - | - |
| R1 | run_persist_duration | persistenceChannel=run | - | - | - | 51 |
| R1 | run_persist | - | 51 | - | - | - |
| R1 | state_store_write_duration | persistenceChannel=event | - | - | - | 50 |
| R1 | state_store_write_duration | persistenceChannel=run | - | - | - | 51 |
| R1 | state_store_write | persistenceChannel=event | 50 | - | - | - |
| R1 | state_store_write | persistenceChannel=run | 51 | - | - | - |
| R2 | host_input_bytes | - | - | 152 | - | - |
| R2 | host_input_duration | - | - | - | - | 1 |
| R2 | host_input_fragment | - | 2 | - | - | - |
| R2 | host_input_unavailable | - | 0 | - | - | - |
| R2 | host_request_duration | operationClass=diagnostic | - | - | - | 1 |
| R2 | host_request_inflight | operationClass=diagnostic | - | - | 1 | - |
| R2 | host_response_bytes | operationClass=diagnostic | - | 385 | - | - |

## open-inactive

- Scenario: `silent-1000-production-seams-open-inactive`
- Completion: `complete`

| Risk | Metric | Labels | Counter | Bytes | Peak gauge | Duration calls |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| R1 | buffered_write_batch | persistenceChannel=transcript | 1 | - | - | - |
| R1 | buffered_write_bytes | persistenceChannel=transcript | - | 64 | - | - |
| R1 | buffered_write_duration | persistenceChannel=transcript | - | - | - | 1 |
| R1 | change_emitted | changeKind=other | 1 | - | - | - |
| R1 | change_emitted | changeKind=run | 51 | - | - | - |
| R1 | change_emitted | changeKind=transcript | 50 | - | - | - |
| R1 | jsonrpc_message | updateClass=notification | 1000 | - | - | - |
| R1 | run_persist_bytes | persistenceChannel=run | - | 187579 | - | - |
| R1 | run_persist_duration | persistenceChannel=run | - | - | - | 51 |
| R1 | run_persist | - | 51 | - | - | - |
| R1 | state_store_write_duration | persistenceChannel=event | - | - | - | 50 |
| R1 | state_store_write_duration | persistenceChannel=run | - | - | - | 51 |
| R1 | state_store_write | persistenceChannel=event | 50 | - | - | - |
| R1 | state_store_write | persistenceChannel=run | 51 | - | - | - |
| R2 | host_input_bytes | - | - | 152 | - | - |
| R2 | host_input_duration | - | - | - | - | 1 |
| R2 | host_input_fragment | - | 2 | - | - | - |
| R2 | host_input_unavailable | - | 0 | - | - | - |
| R2 | host_request_duration | operationClass=diagnostic | - | - | - | 1 |
| R2 | host_request_inflight | operationClass=diagnostic | - | - | 1 | - |
| R2 | host_response_bytes | operationClass=diagnostic | - | 385 | - | - |
| R3 | panel_post_duration | operationClass=panel | - | - | - | 1 |
| R3 | panel_post | operationClass=panel | 1 | - | - | - |
| R3 | panel_prepare_duration | surfaceState=open-inactive | - | - | - | 2 |
| R3 | panel_prepare | surfaceState=open-inactive | 2 | - | - | - |
| R3 | panel_signature_bytes | - | - | 35090 | - | - |
| R3 | panel_signature_duration | - | - | - | - | 2 |
| R3 | panel_signature | - | 2 | - | - | - |

## acp-active

- Scenario: `silent-1000-production-seams-acp-active`
- Completion: `complete`

| Risk | Metric | Labels | Counter | Bytes | Peak gauge | Duration calls |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| R1 | buffered_write_batch | persistenceChannel=transcript | 1 | - | - | - |
| R1 | buffered_write_bytes | persistenceChannel=transcript | - | 64 | - | - |
| R1 | buffered_write_duration | persistenceChannel=transcript | - | - | - | 1 |
| R1 | change_emitted | changeKind=other | 1 | - | - | - |
| R1 | change_emitted | changeKind=run | 51 | - | - | - |
| R1 | change_emitted | changeKind=transcript | 50 | - | - | - |
| R1 | jsonrpc_message | updateClass=notification | 1000 | - | - | - |
| R1 | run_persist_bytes | persistenceChannel=run | - | 187579 | - | - |
| R1 | run_persist_duration | persistenceChannel=run | - | - | - | 51 |
| R1 | run_persist | - | 51 | - | - | - |
| R1 | state_store_write_duration | persistenceChannel=event | - | - | - | 50 |
| R1 | state_store_write_duration | persistenceChannel=run | - | - | - | 51 |
| R1 | state_store_write | persistenceChannel=event | 50 | - | - | - |
| R1 | state_store_write | persistenceChannel=run | 51 | - | - | - |
| R2 | host_input_bytes | - | - | 152 | - | - |
| R2 | host_input_duration | - | - | - | - | 1 |
| R2 | host_input_fragment | - | 2 | - | - | - |
| R2 | host_input_unavailable | - | 0 | - | - | - |
| R2 | host_request_duration | operationClass=diagnostic | - | - | - | 1 |
| R2 | host_request_inflight | operationClass=diagnostic | - | - | 1 | - |
| R2 | host_response_bytes | operationClass=diagnostic | - | 385 | - | - |
| R3 | panel_post_duration | operationClass=panel | - | - | - | 1 |
| R3 | panel_post | operationClass=panel | 1 | - | - | - |
| R3 | panel_prepare_duration | surfaceState=acp-active | - | - | - | 2 |
| R3 | panel_prepare | surfaceState=acp-active | 2 | - | - | - |
| R3 | panel_signature_bytes | - | - | 35090 | - | - |
| R3 | panel_signature_duration | - | - | - | - | 2 |
| R3 | panel_signature | - | 2 | - | - | - |
