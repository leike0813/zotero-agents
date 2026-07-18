## Why

Recorded ACP replay preserves real timer behavior but replays every trace gap, so the fixed nine-run matrix can take hours. Burst replay finishes quickly but collapses the 16 ms Workspace publication, 160 ms live publication, and 2000 ms persistence boundaries that materially affect runtime behavior. A third cadence is needed for routine regression work that preserves those logical timer semantics without waiting for the original wall-clock timeline.

## What Changes

- Add a `logical` replay cadence that advances trace time explicitly and executes replay-owned timer callbacks at their logical deadlines.
- Keep production timer hot paths unchanged and expose tree-shakable synthetic replay control surfaces that are used only by an active logical replay run.
- Mark wall-clock timing evidence from logical replay as synthetic and non-comparable while retaining semantic, persistence, and publication evidence.
- Add Dashboard selection, structured report metadata, contamination detection, cancellation cleanup, release elision, and focused regression coverage.

## Capabilities

### Modified Capabilities

- `acp-runtime-replay-profiler`: Logical-time cadence, run-scoped timer ownership, synthetic timing classification, and zero-overhead inactive behavior.
- `acp-runtime-performance-profiler`: Measurement coverage distinguishes logical semantic evidence from synthetic wall-clock evidence.

## Impact

- Replay cadence types, matrix execution, production replay ports, synthetic Chat/Skills/Workspace timer control surfaces, Dashboard controls, localization, reports, diagnostic bundle elision, tests, and profiler documentation.
