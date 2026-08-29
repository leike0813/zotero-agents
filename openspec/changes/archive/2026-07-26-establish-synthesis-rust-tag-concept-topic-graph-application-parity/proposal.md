## Why

R7 now has real Rust typed application parity for Workbench, Topic, Citation Graph, and Reference workflows, but Tag Vocabulary, Concept KB, and Topic Graph remain Node-only application owners.  These three knowledge-index domains must become typed Rust applications before Checkpoint and Durable Bundle can replace their state without crossing back into Node domain policy.

## What Changes

- Add private Rust typed applications for Tag Vocabulary, Concept KB, and Topic Graph over the existing isolated 51-table repository.
- Extend the Rust repository with domain records, bounded queries, atomic aggregate replacement, and basis-guarded index promotion for the three existing table families.
- Inject typed Tag validation/index, Concept index/query, Topic Graph index, Host tag effect, and legacy binding-resolution ports while retaining the existing Rust kernels and production Host owner.
- Add one independent Node-oracle/Rust-candidate parity corpus, Rust development driver, and checker that compare public DTOs, all durable tables, restart state, and untouched canonical ownership.
- Gate all five candidate targets with the new checker before smoke and record the remaining R7 application blocker.

## Capabilities

### New Capabilities

- `synthesis-rust-tag-concept-topic-graph-application-parity`: Defines typed Rust application/repository parity and independent differential evidence for Tag Vocabulary, Concept KB, and Topic Graph.

### Modified Capabilities

- `synthesis-sidecar-tag-vocabulary-application-foundation`: Requires the private Tag application behavior to have a typed Rust candidate with explicit compute, Host-effect, and legacy-binding ports.
- `synthesis-sidecar-concept-kb-application-foundation`: Requires typed Rust Concept aggregate, review, index, and query parity.
- `synthesis-sidecar-topic-graph-application-foundation`: Requires typed Rust Topic Graph aggregate, relation/review, deletion, and index parity.
- `synthesis-sidecar-isolated-repository-foundation`: Adds typed Rust CRUD and atomic CAS operations for the existing Tag, Concept, and Topic Graph table families.
- `synthesis-cross-language-sidecar-contract`: Adds the versioned three-domain corpus, independent-root driver, complete snapshot report, and candidate gate.
- `synthesis-rust-sidecar-migration-governance`: Records the third completed typed application cluster and keeps R8 blocked on the final Checkpoint/Bundle/WebDAV/Debug cluster.

## Impact

The change affects the Rust `synthesis-application` and `synthesis-repository` crates, Core 210–212 and cross-language tests, development-only parity fixtures/tooling, the five-target candidate workflow, and migration documentation. It does not change the SQLite schema, production `SynthesisClient`, database or canonical owners, HTTP capability inventory, runtime manifest, or production Host routing.
