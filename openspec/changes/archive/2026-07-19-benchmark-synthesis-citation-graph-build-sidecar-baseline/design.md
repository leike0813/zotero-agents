## Context

The current sidecar accepts compute bodies up to 8 MiB, 250,000 request JSON
nodes, and 50,000 response JSON nodes. Citation Graph build accepts much larger
engine inputs, and the existing 2,000-source/20,000-reference performance
fixture already crosses structural request and response limits. The HTTP client
and server materialize complete JSON strings, worker messages use ordinary
structured clone, and strict result rebuilding recomputes the canonical graph.

The sidecar Stage 1 roadmap requires payload, serialization, worker CPU/memory,
event-loop, and cancellation evidence before selecting a large-transfer
design. Measurements must not expand production authority or make
host-dependent timing a flaky regression gate.

## Goals / Non-Goals

**Goals:**

- Create one deterministic graph-build fixture matrix reused by direct-engine
  and sidecar benchmarks.
- Hard-gate stable envelope classification and semantic parity in CI.
- Provide an explicit isolated runner for normal, target, and stress evidence.
- Record enough phase, worker, memory, responsiveness, and cancellation data to
  choose the next transfer contract.

**Non-Goals:**

- Changing compute DTOs, capabilities, error codes, worker limits, deadlines,
  or production composition.
- Implementing chunking, streaming, compression, binary layouts, staging,
  retries, persistence, or graph-build production routing.
- Treating one development host's absolute timings as product budgets.

## Decisions

### Keep benchmark code outside production runtime

The fixture generator and measurement orchestration live under test/scripts.
The runner uses the real built worker and authenticated server as black boxes.
It captures the worker returned by the pool's existing `workerFactory` seam and
uses Node worker inspection APIs for CPU, heap, and event-loop measurements.
No benchmark message, capability, field, or branch is added to the production
compute protocol.

A production telemetry extension was rejected because the current purpose is a
development decision baseline, not an operational observability contract.

### Separate stable CI gates from opt-in scale sampling

Core 200 materializes a small end-to-end canary and the existing
2,000-source/20,000-reference boundary fixture. It asserts deterministic counts,
semantic parity, byte/node classifications, and unchanged runtime ownership.
It does not assert absolute wall time, CPU, RSS, heap, or event-loop values.

The explicit runner samples larger tiers in isolated child processes with
bounded time and memory. Wire rejection, timeout, worker failure, or child
resource exhaustion are structured outcomes rather than runner crashes. Heavy
profiles are not added to ordinary test or build scripts.

### Use fixture profiles, not production data

Profiles use deterministic identifiers and bounded strings with configurable
source, reference, and external-target counts. The matrix contains a small
canary, the existing `2k/20k` boundary, and normal/target/stress tiers from the
performance contract. Reports contain aggregate measurements and runtime
versions only; they exclude tokens, local paths, Zotero data, and full DTOs.

### Classify before executing an ineligible phase

Every profile records request bytes/nodes and the existing stable limit
classification first. A phase that cannot be admitted through the current
wire is marked `not_run` with its reason. Direct and pool-only measurements may
still be run explicitly to isolate compute and structured-clone costs, but they
must not be described as a successful HTTP route.

### Preserve strict rebuilding and expose its cost

The benchmark records request rebuild, direct compute, result rebuild, and
worker round-trip separately. It does not optimize or bypass canonical result
rebuilding. Any redesign of result validation belongs to the later
large-transfer contract and must preserve semantic parity.

## Risks / Trade-offs

- [Synthetic rows underrepresent real string distributions] → Record fixture
  shape and keep conclusions limited to the current deterministic contract.
- [Absolute measurements vary by host] → Keep them report-only and hard-gate
  only deterministic classifications and parity.
- [Target/stress materialization exhausts memory] → Run profiles in isolated
  children and record bounded resource failure as evidence.
- [Benchmark logic drifts from wire validation] → Derive limits from
  `SYNTHESIS_SIDECAR_LIMITS` and regression-test representative classifications.
- [A benchmark becomes an accidental supported API] → Export no production
  types or capabilities and keep CLI output explicitly diagnostic.

## Migration Plan

1. Add Core 200 and the shared fixture matrix before implementing the runner.
2. Reuse the fixture from Core 150 and implement structured measurements.
3. Capture the dated baseline and update active Synthesis documentation.
4. Run focused and repository validation. Rollback removes benchmark-only files
   and restores Core 150's local fixture; no runtime or data migration exists.

## Open Questions

None. The benchmark-only scope, tiered execution policy, unchanged runtime, and
deferred transfer design are fixed.
