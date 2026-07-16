## Why

Advanced Reference Matching remains a nearly 3,000-line pure-compute module inside the plugin runtime, while its production orchestration interleaves Host reads, repository facts, binding computation, canonical dedupe, and durable writes. This prevents a strict process boundary and permits partial durable updates if later computation fails.

## What Changes

- Add a bounded, environment-neutral Reference Matcher engine with separate strict binding and canonical-dedupe contracts.
- Move normalization, identifier extraction, indexing, matching, candidate ranking, cluster blocking, dedupe actions, fixture evaluation, and matcher fingerprinting into `synthesis-engine`.
- Keep Host reads, repository capture, effective redirect and accepted-binding filtering, proposal/fact record construction, user decisions, and graph follow-up operations in the application layer.
- Capture a stable matcher basis, compute outside the write lock, recapture the basis before promotion, and commit binding and dedupe results in one repository transaction.
- Preserve matcher policies, gold-fixture results, explicit-only execution, rejected decisions, public clients, database schema, and the `108 methods / 1 direct consumer` inventory.
- Add a test-only Node worker canary without activating a production worker or sidecar runtime.

## Capabilities

### New Capabilities

- `synthesis-reference-matcher-engine`: Defines strict matcher DTOs, deterministic binding and clustered-dedupe semantics, bounded execution, checkpoints, result rebuilding, and process-readiness canary.

### Modified Capabilities

- `synthesis-reference-resolution-matcher`: Requires Advanced Reference Matching to route both passes through the configured engine and promote only validated complete results.
- `synthesis-persistence-performance`: Requires bounded matcher requests, lock-free compute, basis recapture, and atomic durable promotion.
- `synthesis-invariant-guardrails`: Guards lightweight paths from importing or invoking the heavy matcher engine and keeps fuzzy dedupe bounded.
- `synthesis-job-progress-reporting`: Preserves binding and dedupe progress semantics while engine compute remains persistence-free.
- `synthesis-layer-doc-system`: Describes the engine/application boundary as current state.

## Impact

- Affects `packages/synthesis-engine`, Advanced Reference Matching service orchestration, default/readonly composition, the realtime and gold-label harnesses, focused Core tests, and current-state Synthesis documentation.
- Adds no dependency and does not change Client APIs, service methods, database schema, lightweight sidecar binding, proposal UI, production topology, or service inventory.
