## Context

This change owns twelve non-destructive Artifact, Library Index, schema, and Debug operations. They project several Rust owners and bounded Host artifacts into stable public DTOs; export additionally delivers bytes through reverse Host.

## Goals / Non-Goals

**Goals:**

- Preserve artifact manifests/reads, filtered export, library index, schema, and debug inspection DTOs.
- Keep root paths, credentials, native objects, and unredacted internal state out of public results.
- Prove pagination, coherent snapshots, export receipts, reopen, redaction, bounds, and deadlines.

**Non-Goals:**

- Destructive reset/clean-install behavior.
- WebDAV synchronization.
- Global production activation.

## Decisions

### Build projections from typed snapshots

Library, artifact, schema, and debug compatibility builders consume repository/canonical/application ports at a coherent basis. Debug endpoints use explicit redacted DTOs; they do not serialize arbitrary internal structs.

### Separate artifact source from export delivery

Rust owns artifact selection and manifest generation. Export bytes or descriptors cross only the declared bounded Host delivery port, which returns a stable typed receipt. The compatibility dispatcher never opens Zotero or arbitrary filesystem paths.

### Require observable parity before roster admission

Fixtures cover empty and paged libraries, absent/corrupt artifacts, stable ordering, redaction, export rejection/disconnection, reopen, oversized results, and expired requests.

### Keep operation evidence separate from registry coverage

This surface contains eleven reads and one export mutation. A closed dispatcher registry only proves that an operation can be addressed; it is not readiness evidence. Each operation requires its own compatible result and failure corpus before it enters the ready roster.

## Risks / Trade-offs

- [Cross-owner debug snapshot mixes epochs] → Capture and recheck basis; return superseded on drift.
- [Debug output leaks internal data] → Define allowlisted DTO fields and test redaction semantics.
- [Large artifact export exceeds RPC bounds] → Stream or page through the typed port and keep receipts bounded.
