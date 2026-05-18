# Design

Citation graph metrics become a run-local input receipt, not an agent-authored
fact. After `persist_resolver` derives `paper_workset`, the gate returns
`persist_citation_graph_metrics`. The agent calls
`synthesis.get_citation_graph_metrics` for the gate-provided paper refs and
persists the bounded result with `stage_runtime.py`.

The runtime stores one compact metrics row per workset paper. Missing, stale, or
empty metrics are recorded as diagnostics and do not block the synthesis. Missing
metrics receipts do block artifact export because the run must prove it attempted
to obtain graph context for each paper.

Stage 4 paper analysis must include `graph_metrics_interpretation`. Stage 5
Markdown contexts include a global metrics summary and per-paper compact metrics
blocks. Metrics can influence organization, role hints, and coverage/gap
diagnostics, but claims and timeline events still require digest-backed
`paper_evidence`.
