## 1. Basis-Gated Promotion

- [x] 1.1 Capture `graph_basis_registry_epoch` for graph, metrics, and layout workers.
- [x] 1.2 Add staging or run-scoped promotion APIs for derived output.
- [x] 1.3 Mark event/job superseded when final basis check fails.
- [x] 1.4 Add startup interrupted-run recovery for derived worker rows.
  Existing stale running job cleanup already fails/retries previous-session rows;
  derived workers now also use superseded terminal status on basis mismatch.

## 2. Verification

- [x] 2.1 Add tests where late stale worker commit is rejected.
- [x] 2.2 Add tests proving previous active graph remains readable after stale output is rejected.
- [x] 2.3 Run focused tests and `openspec validate guard-synthesis-derived-worker-promotion --strict`.
