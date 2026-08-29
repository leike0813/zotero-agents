## Why

The isolated Rust sidecar already has the durable schema and typed Topic application parity, but Citation Graph, Reference Refresh, and Reference Matching/Review still execute only through the Node oracle.  Bringing this second application cluster into the Rust candidate makes the migration evidence cover the shared reference facts without changing production ownership or public routes.

## What Changes

- Add a private Rust typed-application implementation for Citation Graph, Reference Refresh, and Reference Matching/Review, backed by the existing complete isolated schema.
- Extend the Rust repository with typed domain CRUD, basis-guarded replacement, and short atomic transactions for those three application families.
- Add a cluster-level Node-oracle/Rust-candidate parity corpus, Rust example driver, and checker that compare public DTOs, durable state, and reopen behavior using physically isolated roots.
- Run the new parity checker before the candidate smoke test and record this completed cluster in the Synthesis migration documentation.

## Capabilities

### New Capabilities

- `synthesis-rust-citation-reference-application-parity`: Establishes differential parity for the private Rust Citation Graph, Reference Refresh, and Reference Matching/Review application cluster.

### Modified Capabilities

- `synthesis-application-foundation`: Extends the environment-neutral typed application owner to the Citation and Reference families.
- `synthesis-sidecar-isolated-repository-foundation`: Adds typed CRUD and CAS replacement for the existing Citation/Reference table families without schema expansion.
- `synthesis-cross-language-sidecar-contract`: Includes the new bounded parity corpus and candidate evidence in the sidecar contract inventory.
- `synthesis-rust-sidecar-migration-governance`: Records the second migrated application cluster and the remaining migration blockers.

## Impact

Affected areas are the Rust `synthesis-application` and `synthesis-repository` crates, Core 207–209 parity coverage, the candidate workflow, Synthesis contract fixtures/checkers, and migration documentation. Production `SynthesisClient`, Host/canonical owners, HTTP capabilities, manifests, and runtime behavior remain unchanged.
