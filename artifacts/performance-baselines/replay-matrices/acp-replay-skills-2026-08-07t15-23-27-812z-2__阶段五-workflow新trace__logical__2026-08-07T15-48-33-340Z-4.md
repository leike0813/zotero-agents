# ACP Runtime Replay Matrix

- Trace: `07ee552256bb7fc2d492a3610051e9dd72a48f5e2ddfe2368e362c8be32ad365`
- Sample: `skills-2026-08-07T15-23-27-812Z-2`
- Stage: `阶段五·workflow新trace`
- Source: `acp-workflow-execution`
- Cadence: `logical`
- Timing classification: `synthetic-logical (non-comparable with recorded wall-clock timing)`
- R2 workload: `ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1`
- Execution completion: `complete`
- Measurement completion: `complete`
- Acceptance: `rejected` (posted-bytes-exceeded:909174>557610, posted-bytes-exceeded:909057>557610)

## Run coverage

| Surface | Role | Run | Execution | Measurement | Acceptance | Synthetic wall ms | Projected | No-op | Unknown | Drain | Transport | R1 | R2 | R3 | Failure |
| --- | --- | ---: | --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- | --- |
| closed | warm-up | 0 | complete | complete | accepted | 25631.0 | 54062 | 54083 | 0 | ok | not-applicable | captured | captured | not-applicable | — |
| closed | formal | 1 | complete | complete | accepted | 25132.0 | 54062 | 54083 | 0 | ok | not-applicable | captured | captured | not-applicable | — |
| closed | formal | 2 | complete | complete | accepted | 24199.0 | 54062 | 54083 | 0 | ok | not-applicable | captured | captured | not-applicable | — |
| open-inactive | warm-up | 0 | complete | complete | accepted | 24676.0 | 54062 | 54083 | 0 | ok | not-applicable | captured | captured | expected-zero | — |
| open-inactive | formal | 1 | complete | complete | accepted | 24399.0 | 54062 | 54083 | 0 | ok | not-applicable | captured | captured | expected-zero | — |
| open-inactive | formal | 2 | complete | complete | accepted | 25031.0 | 54062 | 54083 | 0 | ok | not-applicable | captured | captured | expected-zero | — |
| target-active | warm-up | 0 | complete | complete | rejected: posted-bytes-exceeded:909252>557610 | 37144.0 | 54062 | 54083 | 0 | ok | not-applicable | captured | captured | captured | — |
| target-active | formal | 1 | complete | complete | rejected: posted-bytes-exceeded:909174>557610 | 39007.0 | 54062 | 54083 | 0 | ok | not-applicable | captured | captured | captured | — |
| target-active | formal | 2 | complete | complete | rejected: posted-bytes-exceeded:909057>557610 | 37422.0 | 54062 | 54083 | 0 | ok | not-applicable | captured | captured | captured | — |

## Formal descriptive summary

> Logical cadence preserves replay-owned timer semantics, but wall time, throughput, scheduler lag, event-loop drift, and wall-clock-dependent request duration are synthetic and non-comparable with recorded cadence.

| Surface | n | Synthetic wall ms mean | Range ms | Synthetic events/s | Synthetic MiB/s | Delta vs closed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| closed | 2 | 24665.5 | 24199.0–25132.0 | 4384.5 | 1.079 | 0.0% |
| open-inactive | 2 | 24715.0 | 24399.0–25031.0 | 4375.7 | 1.077 | 0.2% |
| target-active | 2 | 38214.5 | 37422.0–39007.0 | 2829.9 | 0.697 | 54.9% |

## Formal metric totals

| Metric | Closed | Open inactive | Target active |
| --- | ---: | ---: | ---: |
| change_emitted | 580.0 | 580.0 | 579.0 |
| change_requested | 1.0 | 1.0 | 1.0 |
| event_loop_drift | 144.5 | 146.0 | 212.5 |
| host_input_bytes | 536.0 | 536.0 | 536.0 |
| host_input_duration | 10.0 | 10.0 | 10.0 |
| host_input_fragment | 33.0 | 33.0 | 33.0 |
| host_request_duration | 10.0 | 10.0 | 10.0 |
| host_request_inflight | 8.0 | 8.0 | 8.0 |
| host_response_bytes | 566.0 | 566.0 | 566.0 |
| panel_materialization | 0.0 | 0.0 | 186.0 |
| panel_post | 0.0 | 0.0 | 306.0 |
| panel_post_bytes | 0.0 | 0.0 | 909115.5 |
| panel_post_duration | 0.0 | 0.0 | 306.0 |
| panel_render_duration | 0.0 | 0.0 | 306.0 |
| panel_render_inserted_rows | 0.0 | 0.0 | 173.0 |
| panel_render_measured_rows | 0.0 | 0.0 | 408.0 |
| panel_render_removed_rows | 0.0 | 0.0 | 162.0 |
| panel_render_updated_rows | 0.0 | 0.0 | 246.0 |
| panel_requested | 0.0 | 0.0 | 591.0 |
| panel_signature | 0.0 | 0.0 | 185.0 |
| panel_signature_bytes | 0.0 | 0.0 | 44937.0 |
| panel_signature_duration | 0.0 | 0.0 | 185.0 |
| panel_signature_skip | 0.0 | 0.0 | 9.0 |
| run_persist | 608.0 | 608.0 | 607.0 |
| run_persist_bytes | 644378.0 | 644378.0 | 550013.0 |
| run_persist_duration | 608.0 | 608.0 | 607.0 |
| semantic_event | 108145.0 | 108145.0 | 108145.0 |
| semantic_event_bytes | 27911785.0 | 27911785.0 | 27911785.0 |
| semantic_event_duration | 108145.0 | 108145.0 | 108145.0 |
| session_update | 54059.0 | 54059.0 | 54059.0 |
| state_store_write | 608.0 | 608.0 | 607.0 |
| state_store_write_duration | 608.0 | 608.0 | 607.0 |
| transcript_page_read | 0.0 | 0.0 | 1.0 |
| transcript_page_read_duration | 0.0 | 0.0 | 1.0 |
| transcript_page_scan_items | 0.0 | 0.0 | 80.0 |

## Formal duration summaries

| Metric | Surface | Count mean | Total ms mean | Max ms |
| --- | --- | ---: | ---: | ---: |
| event_loop_drift | closed | 144.5 | 10129.0 | 951.0 |
| event_loop_drift | open-inactive | 146.0 | 10030.5 | 858.0 |
| event_loop_drift | target-active | 212.5 | 16875.5 | 239.0 |
| host_input_duration | closed | 10.0 | 2337.0 | 2336.0 |
| host_input_duration | open-inactive | 10.0 | 2312.5 | 2280.0 |
| host_input_duration | target-active | 10.0 | 1305.0 | 1299.0 |
| host_request_duration | closed | 10.0 | 2337.0 | 2336.0 |
| host_request_duration | open-inactive | 10.0 | 2312.5 | 2280.0 |
| host_request_duration | target-active | 10.0 | 1305.0 | 1299.0 |
| panel_post_duration | closed | 0.0 | 0.0 | 0.0 |
| panel_post_duration | open-inactive | 0.0 | 0.0 | 0.0 |
| panel_post_duration | target-active | 306.0 | 37.5 | 6.0 |
| panel_render_duration | closed | 0.0 | 0.0 | 0.0 |
| panel_render_duration | open-inactive | 0.0 | 0.0 | 0.0 |
| panel_render_duration | target-active | 306.0 | 63864.5 | 596.0 |
| panel_signature_duration | closed | 0.0 | 0.0 | 0.0 |
| panel_signature_duration | open-inactive | 0.0 | 0.0 | 0.0 |
| panel_signature_duration | target-active | 185.0 | 2.0 | 1.0 |
| run_persist_duration | closed | 608.0 | 12929.5 | 128.0 |
| run_persist_duration | open-inactive | 608.0 | 12879.0 | 132.0 |
| run_persist_duration | target-active | 607.0 | 13267.0 | 109.0 |
| semantic_event_duration | closed | 108145.0 | 16559.0 | 134.0 |
| semantic_event_duration | open-inactive | 108145.0 | 16539.0 | 137.0 |
| semantic_event_duration | target-active | 108145.0 | 17679.0 | 87.0 |
| state_store_write_duration | closed | 608.0 | 12875.0 | 127.0 |
| state_store_write_duration | open-inactive | 608.0 | 12814.5 | 132.0 |
| state_store_write_duration | target-active | 607.0 | 13206.5 | 109.0 |
| transcript_page_read_duration | closed | 0.0 | 0.0 | 0.0 |
| transcript_page_read_duration | open-inactive | 0.0 | 0.0 | 0.0 |
| transcript_page_read_duration | target-active | 1.0 | 1.0 | 1.0 |
