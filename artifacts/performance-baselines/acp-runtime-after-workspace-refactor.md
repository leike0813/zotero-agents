# ACP Runtime CI Mechanism Smoke Matrix

- Schema: `zotero-agents.acp-runtime-governance-baseline.v1`
- Surfaces: `closed`, `open-inactive`, `acp-active`
- Workload: identical deterministic production R1/R2/buffered-write seams; R3 omitted while closed and exercised for both open states
- Environment: Zotero `mock`, plugin `0.6.1`, platform `node-mock`

> This is a repeatable CI mechanism smoke matrix, not a comparable real-workload baseline. It deliberately excludes machine-dependent timing values and does not claim to reproduce Zotero host latency or UI stalls. Comparable governance evidence comes from source-specific replay matrices.

> Recorded after the Assistant Workspace refactor (Phases 0–4): label shapes and R3 coverage are not comparable with the 2026-07-18 `acp-runtime-before-governance` recording. Region-signature (`panel_signature*`) and transcript page-read (`transcript_page_*`) series are production-emitted as of this recording.

| Surface | Risk | Counters | Bytes | Peak gauge | Duration calls |
| --- | --- | ---: | ---: | ---: | ---: |
| closed | R1 | 1254 | 186164 | 0 | 153 |
| closed | R2 | 4 | 537 | 1 | 3 |
| closed | R3 | 0 | 0 | 0 | 0 |
| open-inactive | R1 | 1254 | 186164 | 0 | 153 |
| open-inactive | R2 | 4 | 537 | 1 | 3 |
| open-inactive | R3 | 4 | 0 | 0 | 0 |
| acp-active | R1 | 1255 | 186164 | 0 | 153 |
| acp-active | R2 | 4 | 537 | 1 | 3 |
| acp-active | R3 | 13 | 3055 | 0 | 11 |

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
| R1 | run_persist_bytes | persistenceChannel=run | - | 186100 | - | - |
| R1 | run_persist_duration | persistenceChannel=run | - | - | - | 51 |
| R1 | run_persist | - | 51 | - | - | - |
| R1 | state_store_write_duration | persistenceChannel=event | - | - | - | 50 |
| R1 | state_store_write_duration | persistenceChannel=run | - | - | - | 51 |
| R1 | state_store_write | persistenceChannel=event | 50 | - | - | - |
| R1 | state_store_write | persistenceChannel=run | 51 | - | - | - |
| R2 | host_input_bytes | - | - | 152 | - | - |
| R2 | host_input_callback_max_duration | - | - | - | - | 1 |
| R2 | host_input_duration | - | - | - | - | 1 |
| R2 | host_input_fragment | - | 2 | - | - | - |
| R2 | host_input_wait | - | 2 | - | - | - |
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
| R1 | change_emitted | changeKind=run | 51 | - | - | - |
| R1 | change_emitted | changeKind=transcript | 50 | - | - | - |
| R1 | jsonrpc_message | updateClass=notification | 1000 | - | - | - |
| R1 | run_persist_bytes | persistenceChannel=run | - | 186100 | - | - |
| R1 | run_persist_duration | persistenceChannel=run | - | - | - | 51 |
| R1 | run_persist | - | 51 | - | - | - |
| R1 | state_store_write_duration | persistenceChannel=event | - | - | - | 50 |
| R1 | state_store_write_duration | persistenceChannel=run | - | - | - | 51 |
| R1 | state_store_write | persistenceChannel=event | 50 | - | - | - |
| R1 | state_store_write | persistenceChannel=run | 51 | - | - | - |
| R2 | host_input_bytes | - | - | 152 | - | - |
| R2 | host_input_callback_max_duration | - | - | - | - | 1 |
| R2 | host_input_duration | - | - | - | - | 1 |
| R2 | host_input_fragment | - | 2 | - | - | - |
| R2 | host_input_wait | - | 2 | - | - | - |
| R2 | host_request_duration | operationClass=diagnostic | - | - | - | 1 |
| R2 | host_request_inflight | operationClass=diagnostic | - | - | 1 | - |
| R2 | host_response_bytes | operationClass=diagnostic | - | 385 | - | - |
| R3 | panel_dropped_before_build | publicationCausality=opposite-active, publicationSurface=acp-skills | 2 | - | - | - |
| R3 | panel_requested | publicationCausality=opposite-active, publicationSurface=acp-skills | 2 | - | - | - |

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
| R1 | run_persist_bytes | persistenceChannel=run | - | 186100 | - | - |
| R1 | run_persist_duration | persistenceChannel=run | - | - | - | 51 |
| R1 | run_persist | - | 51 | - | - | - |
| R1 | state_store_write_duration | persistenceChannel=event | - | - | - | 50 |
| R1 | state_store_write_duration | persistenceChannel=run | - | - | - | 51 |
| R1 | state_store_write | persistenceChannel=event | 50 | - | - | - |
| R1 | state_store_write | persistenceChannel=run | 51 | - | - | - |
| R2 | host_input_bytes | - | - | 152 | - | - |
| R2 | host_input_callback_max_duration | - | - | - | - | 1 |
| R2 | host_input_duration | - | - | - | - | 1 |
| R2 | host_input_fragment | - | 2 | - | - | - |
| R2 | host_input_wait | - | 2 | - | - | - |
| R2 | host_request_duration | operationClass=diagnostic | - | - | - | 1 |
| R2 | host_request_inflight | operationClass=diagnostic | - | - | 1 | - |
| R2 | host_response_bytes | operationClass=diagnostic | - | 385 | - | - |
| R3 | panel_post_bytes | publicationKind=message-counts, publicationSurface=acp-skills, publicationForm=region | - | 456 | - | - |
| R3 | panel_post_bytes | publicationKind=owner-navigation, publicationSurface=acp-skills, publicationForm=region | - | 516 | - | - |
| R3 | panel_post_bytes | publicationKind=service-status, publicationSurface=acp-skills, publicationForm=region | - | 316 | - | - |
| R3 | panel_post_bytes | publicationKind=transcript, publicationSurface=acp-skills, publicationForm=snapshot | - | 1335 | - | - |
| R3 | panel_post_duration | publicationKind=message-counts, publicationSurface=acp-skills, publicationForm=region | - | - | - | 1 |
| R3 | panel_post_duration | publicationKind=owner-navigation, publicationSurface=acp-skills, publicationForm=region | - | - | - | 1 |
| R3 | panel_post_duration | publicationKind=service-status, publicationSurface=acp-skills, publicationForm=region | - | - | - | 1 |
| R3 | panel_post_duration | publicationKind=transcript, publicationSurface=acp-skills, publicationForm=snapshot | - | - | - | 2 |
| R3 | panel_post | publicationKind=message-counts, publicationSurface=acp-skills, publicationForm=region | 1 | - | - | - |
| R3 | panel_post | publicationKind=owner-navigation, publicationSurface=acp-skills, publicationForm=region | 1 | - | - | - |
| R3 | panel_post | publicationKind=service-status, publicationSurface=acp-skills, publicationForm=region | 1 | - | - | - |
| R3 | panel_post | publicationKind=transcript, publicationSurface=acp-skills, publicationForm=snapshot | 2 | - | - | - |
| R3 | panel_prepare_duration | publicationSurface=acp-skills | - | - | - | 1 |
| R3 | panel_prepare | publicationSurface=acp-skills | 1 | - | - | - |
| R3 | panel_signature_bytes | publicationKind=message-counts, publicationSurface=acp-skills | - | 210 | - | - |
| R3 | panel_signature_bytes | publicationKind=owner-navigation, publicationSurface=acp-skills | - | 210 | - | - |
| R3 | panel_signature_bytes | publicationKind=service-status, publicationSurface=acp-skills | - | 12 | - | - |
| R3 | panel_signature_duration | publicationKind=message-counts, publicationSurface=acp-skills | - | - | - | 2 |
| R3 | panel_signature_duration | publicationKind=owner-navigation, publicationSurface=acp-skills | - | - | - | 1 |
| R3 | panel_signature_duration | publicationKind=service-status, publicationSurface=acp-skills | - | - | - | 1 |
| R3 | panel_signature_skip | publicationKind=message-counts, publicationSurface=acp-skills | 1 | - | - | - |
| R3 | panel_signature | publicationKind=message-counts, publicationSurface=acp-skills | 2 | - | - | - |
| R3 | panel_signature | publicationKind=owner-navigation, publicationSurface=acp-skills | 1 | - | - | - |
| R3 | panel_signature | publicationKind=service-status, publicationSurface=acp-skills | 1 | - | - | - |
| R3 | transcript_page_read_duration | publicationPhase=initialization, publicationSurface=acp-skills | - | - | - | 1 |
| R3 | transcript_page_read | publicationPhase=initialization, publicationSurface=acp-skills | 1 | - | - | - |
| R3 | transcript_page_scan_items | publicationPhase=initialization, publicationSurface=acp-skills | 1 | - | - | - |
