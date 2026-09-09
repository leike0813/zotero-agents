# Citation Graph Build Sidecar Data-Path Baseline

> Captured: 2026-07-17
>
> Change: `benchmark-synthesis-citation-graph-build-sidecar-baseline`
>
> Runtime: Node `24.12.0`, Linux x64

## Purpose

This baseline measures the current monolithic Citation Graph build path before
selecting a production-scale transfer contract. It does not change production
routing or claim that synthetic timing generalizes to every Zotero library.

The reproducible commands are:

```bash
npm run benchmark:synthesis-citation-graph-build-sidecar -- --profile canary
npm run benchmark:synthesis-citation-graph-build-sidecar -- --profile boundary
npm run benchmark:synthesis-citation-graph-build-sidecar -- --profile normal
npm run benchmark:synthesis-citation-graph-build-sidecar -- --profile target
npm run benchmark:synthesis-citation-graph-build-sidecar -- --profile stress
```

Each profile runs in an isolated parent process. The sidecar worker retains its
production 256 MiB old-generation, 32 MiB young-generation, and 4 MiB stack
limits. Target and stress parent processes were capped at 768 MiB old
generation. Reports contain aggregate measurements only.

## Stable Envelope Results

| Profile | Sources / references / external targets | Request bytes / JSON nodes | Response bytes / JSON nodes | Current HTTP outcome |
| --- | --- | ---: | ---: | --- |
| canary | 2 / 2 / 1 | 989 / 91 | 2,402 / 243 | success |
| boundary | 2,000 / 20,000 / 500 | 5,045,133 / 460,027 | 9,875,145 / 887,045 | `request_json_too_large` |
| normal | 2,000 / 100,000 / 60,000 | 24,965,093 / 2,220,027 | 71,757,129 / 6,714,045 | `request_body_too_large` |
| target | 10,000 / 500,000 / 300,000 | not materialized | not materialized | isolated parent terminated by signal |
| stress | 25,000 / 1,250,000 / 750,000 | not materialized | not materialized | isolated parent terminated by signal |

The authoritative wire allows 8 MiB for each compute request and response,
250,000 request JSON nodes, and 50,000 response JSON nodes. The boundary fixture
therefore fails structurally before its request reaches the worker, even though
its request bytes fit. Its computed result exceeds both response limits.

## Captured Phase Observations

Values below are observations from the capture host, not CI budgets.

| Phase | canary | boundary | normal |
| --- | ---: | ---: | ---: |
| request rebuild | 26.3 ms | 236.3 ms | 952.5 ms |
| request stringify | 0.1 ms | 30.8 ms | 118.4 ms |
| request parse | 0.1 ms | 45.0 ms | 119.6 ms |
| direct compute | 2.0 ms | 275.9 ms | 1,243.4 ms |
| strict result rebuild | 2.4 ms | 998.6 ms | 7,626.2 ms |
| response stringify | 0.1 ms | 35.5 ms | 413.9 ms |
| worker round trip | 47.2 ms | 2,959.2 ms | 5,732.6 ms / `worker_timeout` |
| authenticated HTTP | 27.8 ms | 286.8 ms / rejected | 750.7 ms / preflight rejected |
| cancellation probe | 357.2 ms | 261.3 ms | 301.1 ms |

The boundary worker result matched the direct result. Its sampled parent peak
was about 486 MB RSS / 103 MB heap, worker CPU was about 1.49 s user plus 0.07 s
system, maximum sampled main-loop lag was 162 ms, and health completed in 193
ms. The normal worker timed out after the five-second execution deadline;
sampled parent peak reached about 1.11 GB RSS / 485 MB heap, main-loop lag was
778 ms, and health still completed in 807 ms. Cancellation returned the stable
`worker_canceled` code and cleanup completed for every successful parent run.

## Interpretation

1. Small authenticated HTTP/worker execution is semantically sound, but the
   monolithic JSON envelope is not a production-scale transfer contract.
2. The first representative boundary fails on request structure and both
   response limits; raising only the 8 MiB byte cap would not make it eligible.
3. At normal scale, strict result rebuilding costs substantially more than the
   kernel compute and pushes the worker path beyond its hard deadline.
4. Target and stress cannot safely materialize the current complete object graph
   under the bounded benchmark parent. More canaries or direct routing would
   enlarge an already invalid data path.

The bounded transfer contract and packed streaming-worker follow-up now address
that data-path prerequisite. Core 202 sends canonical pages one at a time,
hard-gates the normal 2,000-source/100,000-reference profile under the worker's
256 MiB old-generation limit and 30-second active deadline, and atomically
publishes output larger than one 8 MiB envelope. This does not revise the
captured monolithic measurements above. Target and stress remain report-only,
and plugin-owned basis recapture and promotion still require a separate
production-routing change. No automatic in-process fallback is authorized.
