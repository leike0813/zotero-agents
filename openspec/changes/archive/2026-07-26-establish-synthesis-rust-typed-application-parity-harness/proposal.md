## Why

R7 currently proves Rust repository and canonical-store parity, but its claimed application parity is only a thirteen-family inventory exercised through a generic state machine. That evidence does not execute the real Node application behavior and cannot justify advancing to R8 native manifest and lifecycle work.

## What Changes

- Add a real Node/Rust typed application differential harness with Workbench and Topic as the first reference slice.
- Replace the Rust generic `ApplicationKind` command executor and synthetic application state with typed Workbench and Topic applications, DTOs, and ports.
- Extend the Rust repository and canonical-store adapters with the bounded typed operations needed by those applications while preserving the existing schema and durable implementation.
- Compose the Rust candidate from typed Workbench and canonical owners without changing the two existing wire DTOs or exposing a Topic mutation capability.
- Add an independent versioned application corpus, strict parity report, restart comparison, and five-target workflow gate.
- Correct R7 documentation and governance: repository/canonical parity remains accepted, application inventory is no longer parity evidence, and R8 remains blocked until all remaining application families receive real typed differential coverage.
- Keep production routing, public `SynthesisClient`, production database/canonical owners, runtime manifest, installer, and supervisor unchanged.

## Capabilities

### New Capabilities

- `synthesis-rust-typed-application-parity-harness`: Defines the independent corpus, dual-execution driver, report contract, fingerprints, durable snapshots, and acceptance gates for typed application parity.

### Modified Capabilities

- `synthesis-rust-durable-foundation-parity`: Narrows accepted R7 evidence to proven repository/canonical parity plus explicitly completed typed application slices.
- `synthesis-sidecar-workbench-chrome-read-model`: Requires the Rust canary to use a typed Workbench owner matching the Node application semantics.
- `synthesis-sidecar-topic-application-foundation`: Requires a typed Rust Topic application with the existing apply/read/lifecycle semantics.
- `synthesis-sidecar-isolated-repository-foundation`: Adds bounded typed cache, operation, Topic state, and Topic projection repository ports without moving application policy into persistence.
- `synthesis-sidecar-topic-canonical-store-foundation`: Adds a typed Rust internal read/promote/receipt adapter over the existing durable store.
- `synthesis-cross-language-sidecar-contract`: Separates the application corpus from the durable foundation corpus and defines a strict typed parity report.
- `synthesis-rust-sidecar-migration-governance`: Blocks R8 until all application families have real typed differential evidence.

## Impact

The change affects the Rust sidecar application, repository, canonical-store, and candidate composition crates; development-only contract fixtures and parity tooling; Core 204/206/218 tests; the five-target Rust candidate workflow; OpenSpec migration specifications; and Synthesis migration documentation. It introduces no dependency, production API, schema, storage-owner, or packaging-lifecycle change.
