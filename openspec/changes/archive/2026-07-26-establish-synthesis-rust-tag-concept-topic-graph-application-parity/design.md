## Context

R7 has durable Rust repository/canonical parity and typed application parity for Workbench, Topic, Citation Graph, and Reference workflows. Tag Vocabulary, Concept KB, and Topic Graph still execute application policy only through the frozen Node oracle even though their deterministic kernels and SQLite tables already exist. The subsequent Checkpoint and Durable Bundle applications consume all three aggregates, so this cluster must be complete before the final R7 slice.

The candidate remains private and isolated. Node and Rust receive different mutable roots and share only immutable fixtures. Production clients, Host effects, canonical ownership, runtime manifests, and public capability registration are outside this change.

## Goals / Non-Goals

**Goals:**

- Implement high-cohesion typed Rust applications for Tag Vocabulary, Concept KB, and Topic Graph.
- Keep application policy and lifecycle above typed repository CRUD/CAS transactions.
- Reuse the existing Rust kernels through cancellable typed ports and model Tag Host interactions as injected ports.
- Produce independent Node/Rust evidence for public DTOs, all 51 tables, restart behavior, and ownership invariants.

**Non-Goals:**

- Production cutover, new HTTP capabilities, manifest/lifecycle v2, or Node fallback.
- SQLite schema/index changes, canonical writes, real Host mutation, or automatic downstream Checkpoint/Bundle/WebDAV/Debug work.
- A generic application dispatcher, string-selected repository API, or synthetic application state.

## Decisions

### Three domain modules share infrastructure, not state machines

`synthesis-application` adds `tag_vocabulary`, `concept_kb`, and `topic_graph` modules. Each module owns its strict DTOs, policy, admission, cancellation, and drain state. Shared code is limited to existing repository/protocol primitives. An umbrella command executor was rejected because the three domains have materially different CAS bases, review rules, and post-commit behavior.

### Repository APIs mirror existing aggregates

The repository exposes typed rows and complete replacements for the existing nine Tag, seven Concept, and four Topic Graph tables. Aggregate replacement and index promotion use expected vocabulary/staged revision or manifest hashes inside short transactions. Projection, validation, merge, review, relation, and Host-effect policy never move into SQL.

### Compute and Host work use explicit ports

Tag validation/index, Concept index/query, and Topic Graph index are cancellable typed compute ports backed by existing Rust kernels. Tag promotion records durable effects before calling a typed Host-effect port; Host failure becomes a stable warning and leaves committed state intact. Legacy binding migration uses a separate bounded resolver port. The parity driver supplies deterministic adapters and never contacts production Host state.

### One self-contained cluster corpus is the acceptance evidence

`synthesis-tag-concept-topic-graph-application-parity-v1` fixes clocks, IDs, compute/Host/resolver responses, and fault phases. The checker executes actual Node and Rust applications with separate runtime and canonical roots, then compares public observations and table-specific stable projections from all 51 sorted table snapshots. It also verifies cache/operation rows, close/reopen state, and untouched canonical tree, journal, and receipt. The corpus may seed all three aggregates but does not invoke a downstream application.

## Risks / Trade-offs

- [Tag promotion spans durable and external effects] → Commit effects first, dispatch through an injected port, and compare post-commit warnings plus receipts.
- [Complete aggregate replacement can partially fail] → Parse before entry, use one transaction with expected-basis CAS, and retain the last-good aggregate on every SQL fault.
- [Application policy is broader than a small corpus] → Extend Core 210–212 first and include stable lifecycle, review, deletion, supersession, and restart boundaries.
- [Async computation can race stop] → Recheck admission before promotion, abort active computation, reject new work, and drain before repository closure.
- [Implementation-derived hashes differ] → Normalize only fields whose public meaning and referential integrity are checked separately; compare untouched tables exactly.

## Migration Plan

1. Extend Core 210–212 and Rust repository tests with the agreed stable behavior.
2. Add typed repository records/CAS operations and the three application modules with explicit ports.
3. Add the independent corpus, Rust example driver, Node checker, and Core 218 evidence.
4. Run the checker before candidate smoke on all workflow targets and update migration documentation.
5. If parity fails, retain Node solely as the oracle and discard isolated roots; no production rollback is needed.

## Open Questions

None. Existing Node contracts, Rust kernels, complete schema, and two prior typed parity clusters establish the compatibility boundary.
