# ACP Runtime Replay Matrix

- Trace: `5e6094aa693b4d769cb4b190290408b7dd33af9f6f1ebfe8ec43eb4f83014dca`
- Sample: `skills-2026-07-13T10-08-16-777Z-1`
- Stage: `阶段五·workflow旧trace回归`
- Source: `acp-workflow-execution`
- Cadence: `logical`
- Timing classification: `synthetic-logical (non-comparable with recorded wall-clock timing)`
- R2 workload: `ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1`
- Execution completion: `complete`
- Measurement completion: `complete`
- Acceptance: `rejected` (posted-bytes-exceeded:631639>557610)

## Run coverage

| Surface | Role | Run | Execution | Measurement | Acceptance | Synthetic wall ms | Projected | No-op | Unknown | Drain | Transport | R1 | R2 | R3 | Failure |
| --- | --- | ---: | --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- | --- |
| closed | warm-up | 0 | complete | complete | accepted | 38918.0 | 7695 | 7733 | 0 | ok | not-applicable | captured | captured | not-applicable | — |
| closed | formal | 1 | complete | complete | accepted | 38334.0 | 7695 | 7733 | 0 | ok | not-applicable | captured | captured | not-applicable | — |
| closed | formal | 2 | complete | complete | accepted | 38397.0 | 7695 | 7733 | 0 | ok | not-applicable | captured | captured | not-applicable | — |
| open-inactive | warm-up | 0 | complete | complete | accepted | 38308.0 | 7695 | 7733 | 0 | ok | not-applicable | captured | captured | expected-zero | — |
| open-inactive | formal | 1 | complete | complete | accepted | 38379.0 | 7695 | 7733 | 0 | ok | not-applicable | captured | captured | expected-zero | — |
| open-inactive | formal | 2 | complete | complete | accepted | 38560.0 | 7695 | 7733 | 0 | ok | not-applicable | captured | captured | expected-zero | — |
| target-active | warm-up | 0 | complete | complete | rejected: posted-bytes-exceeded:631639>557610 | 56002.0 | 7695 | 7733 | 0 | ok | not-applicable | captured | captured | captured | — |
| target-active | formal | 1 | complete | complete | rejected: posted-bytes-exceeded:631639>557610 | 54551.0 | 7695 | 7733 | 0 | ok | not-applicable | captured | captured | captured | — |
| target-active | formal | 2 | complete | complete | rejected: posted-bytes-exceeded:631639>557610 | 54943.0 | 7695 | 7733 | 0 | ok | not-applicable | captured | captured | captured | — |

## Formal descriptive summary

> Logical cadence preserves replay-owned timer semantics, but wall time, throughput, scheduler lag, event-loop drift, and wall-clock-dependent request duration are synthetic and non-comparable with recorded cadence.

| Surface | n | Synthetic wall ms mean | Range ms | Synthetic events/s | Synthetic MiB/s | Delta vs closed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| closed | 2 | 38365.5 | 38334.0–38397.0 | 402.1 | 0.145 | 0.0% |
| open-inactive | 2 | 38469.5 | 38379.0–38560.0 | 401.0 | 0.144 | 0.3% |
| target-active | 2 | 54747.0 | 54551.0–54943.0 | 281.8 | 0.101 | 42.7% |

## Formal metric totals

| Metric | Closed | Open inactive | Target active |
| --- | ---: | ---: | ---: |
| change_emitted | 7834.0 | 7834.0 | 7833.0 |
| change_requested | 5.0 | 5.0 | 5.0 |
| event_loop_drift | 218.0 | 216.0 | 286.0 |
| host_input_bytes | 536.0 | 536.0 | 536.0 |
| host_input_duration | 10.0 | 10.0 | 10.0 |
| host_input_fragment | 33.0 | 33.0 | 33.0 |
| host_request_duration | 10.0 | 10.0 | 10.0 |
| host_request_inflight | 8.0 | 8.0 | 8.0 |
| host_response_bytes | 566.0 | 566.0 | 566.0 |
| panel_materialization | 0.0 | 0.0 | 158.0 |
| panel_post | 0.0 | 0.0 | 407.0 |
| panel_post_bytes | 0.0 | 0.0 | 631639.0 |
| panel_post_duration | 0.0 | 0.0 | 407.0 |
| panel_render_duration | 0.0 | 0.0 | 407.0 |
| panel_render_inserted_rows | 0.0 | 0.0 | 138.0 |
| panel_render_measured_rows | 0.0 | 0.0 | 463.0 |
| panel_render_removed_rows | 0.0 | 0.0 | 44.0 |
| panel_render_updated_rows | 0.0 | 0.0 | 419.0 |
| panel_requested | 0.0 | 0.0 | 7857.0 |
| panel_signature | 0.0 | 0.0 | 157.0 |
| panel_signature_bytes | 0.0 | 0.0 | 37669.0 |
| panel_signature_duration | 0.0 | 0.0 | 157.0 |
| panel_signature_skip | 0.0 | 0.0 | 15.0 |
| run_persist | 694.0 | 694.0 | 693.0 |
| run_persist_bytes | 714316.0 | 714316.0 | 606707.0 |
| run_persist_duration | 694.0 | 694.0 | 693.0 |
| semantic_event | 15428.0 | 15428.0 | 15428.0 |
| semantic_event_bytes | 5821871.0 | 5821871.0 | 5821871.0 |
| semantic_event_duration | 15428.0 | 15428.0 | 15428.0 |
| session_update | 7689.0 | 7689.0 | 7689.0 |
| state_store_write | 694.0 | 694.0 | 693.0 |
| state_store_write_duration | 694.0 | 694.0 | 693.0 |
| transcript_page_read | 0.0 | 0.0 | 1.0 |
| transcript_page_read_duration | 0.0 | 0.0 | 1.0 |
| transcript_page_scan_items | 0.0 | 0.0 | 80.0 |

## Formal duration summaries

| Metric | Surface | Count mean | Total ms mean | Max ms |
| --- | --- | ---: | ---: | ---: |
| event_loop_drift | closed | 218.0 | 16447.0 | 1101.0 |
| event_loop_drift | open-inactive | 216.0 | 16762.0 | 1071.0 |
| event_loop_drift | target-active | 286.0 | 26097.0 | 356.0 |
| host_input_duration | closed | 10.0 | 1937.5 | 1939.0 |
| host_input_duration | open-inactive | 10.0 | 1910.0 | 1897.0 |
| host_input_duration | target-active | 10.0 | 1526.0 | 1551.0 |
| host_request_duration | closed | 10.0 | 1937.5 | 1939.0 |
| host_request_duration | open-inactive | 10.0 | 1910.0 | 1897.0 |
| host_request_duration | target-active | 10.0 | 1526.0 | 1551.0 |
| panel_post_duration | closed | 0.0 | 0.0 | 0.0 |
| panel_post_duration | open-inactive | 0.0 | 0.0 | 0.0 |
| panel_post_duration | target-active | 407.0 | 38.0 | 1.0 |
| panel_render_duration | closed | 0.0 | 0.0 | 0.0 |
| panel_render_duration | open-inactive | 0.0 | 0.0 | 0.0 |
| panel_render_duration | target-active | 407.0 | 87237.0 | 573.0 |
| panel_signature_duration | closed | 0.0 | 0.0 | 0.0 |
| panel_signature_duration | open-inactive | 0.0 | 0.0 | 0.0 |
| panel_signature_duration | target-active | 157.0 | 0.5 | 1.0 |
| run_persist_duration | closed | 694.0 | 14783.5 | 214.0 |
| run_persist_duration | open-inactive | 694.0 | 14796.5 | 245.0 |
| run_persist_duration | target-active | 693.0 | 15092.0 | 54.0 |
| semantic_event_duration | closed | 15428.0 | 29056.0 | 96.0 |
| semantic_event_duration | open-inactive | 15428.0 | 28943.5 | 168.0 |
| semantic_event_duration | target-active | 15428.0 | 29316.5 | 59.0 |
| state_store_write_duration | closed | 694.0 | 14698.5 | 214.0 |
| state_store_write_duration | open-inactive | 694.0 | 14708.5 | 245.0 |
| state_store_write_duration | target-active | 693.0 | 15011.0 | 54.0 |
| transcript_page_read_duration | closed | 0.0 | 0.0 | 0.0 |
| transcript_page_read_duration | open-inactive | 0.0 | 0.0 | 0.0 |
| transcript_page_read_duration | target-active | 1.0 | 1.0 | 1.0 |
