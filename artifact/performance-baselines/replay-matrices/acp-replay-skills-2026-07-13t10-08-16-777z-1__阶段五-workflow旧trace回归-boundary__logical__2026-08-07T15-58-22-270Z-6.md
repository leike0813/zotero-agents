# ACP Runtime Replay Matrix

- Trace: `5e6094aa693b4d769cb4b190290408b7dd33af9f6f1ebfe8ec43eb4f83014dca`
- Sample: `skills-2026-07-13T10-08-16-777Z-1`
- Stage: `阶段五·workflow旧trace回归·boundary`
- Source: `acp-workflow-execution`
- Cadence: `logical`
- Timing classification: `synthetic-logical (non-comparable with recorded wall-clock timing)`
- R2 workload: `ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1`
- Execution completion: `complete`
- Measurement completion: `complete`
- Acceptance: `accepted`

## Run coverage

| Surface | Role | Run | Execution | Measurement | Acceptance | Synthetic wall ms | Projected | No-op | Unknown | Drain | Transport | R1 | R2 | R3 | Failure |
| --- | --- | ---: | --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- | --- |
| closed | warm-up | 0 | complete | complete | accepted | 19832.0 | 7695 | 7733 | 0 | ok | not-applicable | captured | captured | not-applicable | — |
| closed | formal | 1 | complete | complete | accepted | 20022.0 | 7695 | 7733 | 0 | ok | not-applicable | captured | captured | not-applicable | — |
| closed | formal | 2 | complete | complete | accepted | 19586.0 | 7695 | 7733 | 0 | ok | not-applicable | captured | captured | not-applicable | — |
| open-inactive | warm-up | 0 | complete | complete | accepted | 20158.0 | 7695 | 7733 | 0 | ok | not-applicable | captured | captured | expected-zero | — |
| open-inactive | formal | 1 | complete | complete | accepted | 20005.0 | 7695 | 7733 | 0 | ok | not-applicable | captured | captured | expected-zero | — |
| open-inactive | formal | 2 | complete | complete | accepted | 19819.0 | 7695 | 7733 | 0 | ok | not-applicable | captured | captured | expected-zero | — |
| target-active | warm-up | 0 | complete | complete | accepted | 30230.0 | 7695 | 7733 | 0 | ok | not-applicable | captured | captured | captured | — |
| target-active | formal | 1 | complete | complete | accepted | 29505.0 | 7695 | 7733 | 0 | ok | not-applicable | captured | captured | captured | — |
| target-active | formal | 2 | complete | complete | accepted | 30583.0 | 7695 | 7733 | 0 | ok | not-applicable | captured | captured | captured | — |

## Formal descriptive summary

> Logical cadence preserves replay-owned timer semantics, but wall time, throughput, scheduler lag, event-loop drift, and wall-clock-dependent request duration are synthetic and non-comparable with recorded cadence.

| Surface | n | Synthetic wall ms mean | Range ms | Synthetic events/s | Synthetic MiB/s | Delta vs closed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| closed | 2 | 19804.0 | 19586.0–20022.0 | 779.0 | 0.280 | 0.0% |
| open-inactive | 2 | 19912.0 | 19819.0–20005.0 | 774.8 | 0.279 | 0.5% |
| target-active | 2 | 30044.0 | 29505.0–30583.0 | 513.5 | 0.185 | 51.7% |

## Formal metric totals

| Metric | Closed | Open inactive | Target active |
| --- | ---: | ---: | ---: |
| change_emitted | 490.0 | 490.0 | 489.0 |
| change_requested | 2.0 | 2.0 | 2.0 |
| event_loop_drift | 116.5 | 118.0 | 176.0 |
| host_input_bytes | 536.0 | 536.0 | 536.0 |
| host_input_duration | 10.0 | 10.0 | 10.0 |
| host_input_fragment | 33.0 | 33.0 | 33.0 |
| host_request_duration | 10.0 | 10.0 | 10.0 |
| host_request_inflight | 8.0 | 8.0 | 8.0 |
| host_response_bytes | 566.0 | 566.0 | 566.0 |
| panel_materialization | 0.0 | 0.0 | 155.0 |
| panel_post | 0.0 | 0.0 | 250.0 |
| panel_post_bytes | 0.0 | 0.0 | 508717.5 |
| panel_post_duration | 0.0 | 0.0 | 250.0 |
| panel_render_duration | 0.0 | 0.0 | 250.0 |
| panel_render_inserted_rows | 0.0 | 0.0 | 138.0 |
| panel_render_measured_rows | 0.0 | 0.0 | 350.0 |
| panel_render_removed_rows | 0.0 | 0.0 | 118.0 |
| panel_render_updated_rows | 0.0 | 0.0 | 232.0 |
| panel_requested | 0.0 | 0.0 | 513.0 |
| panel_signature | 0.0 | 0.0 | 154.0 |
| panel_signature_bytes | 0.0 | 0.0 | 36929.0 |
| panel_signature_duration | 0.0 | 0.0 | 154.0 |
| panel_signature_skip | 0.0 | 0.0 | 12.0 |
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
| event_loop_drift | closed | 116.5 | 8009.0 | 1012.0 |
| event_loop_drift | open-inactive | 118.0 | 7965.0 | 989.0 |
| event_loop_drift | target-active | 176.0 | 12343.0 | 391.0 |
| host_input_duration | closed | 10.0 | 1207.5 | 1182.0 |
| host_input_duration | open-inactive | 10.0 | 1175.5 | 1157.0 |
| host_input_duration | target-active | 10.0 | 1242.0 | 1293.0 |
| host_request_duration | closed | 10.0 | 1207.5 | 1182.0 |
| host_request_duration | open-inactive | 10.0 | 1175.5 | 1157.0 |
| host_request_duration | target-active | 10.0 | 1242.0 | 1293.0 |
| panel_post_duration | closed | 0.0 | 0.0 | 0.0 |
| panel_post_duration | open-inactive | 0.0 | 0.0 | 0.0 |
| panel_post_duration | target-active | 250.0 | 30.0 | 1.0 |
| panel_render_duration | closed | 0.0 | 0.0 | 0.0 |
| panel_render_duration | open-inactive | 0.0 | 0.0 | 0.0 |
| panel_render_duration | target-active | 250.0 | 49296.5 | 586.0 |
| panel_signature_duration | closed | 0.0 | 0.0 | 0.0 |
| panel_signature_duration | open-inactive | 0.0 | 0.0 | 0.0 |
| panel_signature_duration | target-active | 154.0 | 1.0 | 1.0 |
| run_persist_duration | closed | 694.0 | 14890.5 | 120.0 |
| run_persist_duration | open-inactive | 694.0 | 14995.5 | 78.0 |
| run_persist_duration | target-active | 693.0 | 14728.0 | 109.0 |
| semantic_event_duration | closed | 15428.0 | 10844.0 | 152.0 |
| semantic_event_duration | open-inactive | 15428.0 | 10865.0 | 82.0 |
| semantic_event_duration | target-active | 15428.0 | 10661.5 | 123.0 |
| state_store_write_duration | closed | 694.0 | 14812.5 | 120.0 |
| state_store_write_duration | open-inactive | 694.0 | 14914.5 | 78.0 |
| state_store_write_duration | target-active | 693.0 | 14664.5 | 109.0 |
| transcript_page_read_duration | closed | 0.0 | 0.0 | 0.0 |
| transcript_page_read_duration | open-inactive | 0.0 | 0.0 | 0.0 |
| transcript_page_read_duration | target-active | 1.0 | 0.5 | 1.0 |
