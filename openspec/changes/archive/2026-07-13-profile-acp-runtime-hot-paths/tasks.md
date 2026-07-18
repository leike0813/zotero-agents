## 1. Profiler Contract and Automated Baseline

- [x] 1.1 Add failing tests for debug-only activation, bounded metrics, lifecycle, attribution, event-loop drift, immutable snapshots, and error isolation.
- [x] 1.2 Implement the side-effect-free ACP runtime performance profiler and deterministic fixture helpers.
- [x] 1.3 Add the silent runtime mechanism baseline and release-build profiler-elision tests.

## 2. Runtime Instrumentation

- [x] 2.1 Instrument ACP connection, adapter, run lifecycle, persistence, SQL, and change publication for R1 using durable request ids.
- [x] 2.2 Instrument Host Bridge request reading and handling for R2 with scope-based request attribution and global fallback.
- [x] 2.3 Instrument Assistant Workspace host publication for R3 without adding profiler state to snapshots, signatures, render keys, or static shell runtime.
- [x] 2.4 Instrument transport queues, assistant accumulation, and transcript/audit/runtime-log buffered work with bounded counters, gauges, and durations.

## 3. Export and Documentation

- [x] 3.1 Add optional bounded performance profiles to developer and issue diagnostic bundles and the test performance digest.
- [x] 3.2 Update debug-mode, testing, and audit documentation to describe build-time elimination, explicit activation, automated mechanism baselines, and optional real-host calibration.

## 4. Validation

- [x] 4.1 Run targeted profiler, integration, baseline, export, and release-elision tests and resolve failures.
- [x] 4.2 Run core tests, build, lint, and strict OpenSpec validation; document any environment-limited checks.
