## Context

See `proposal.md` for motivation. `ReferenceCanonicalApplication` currently sits in the runtime crate and combines application rules with concrete repository access, reverse-Host transport, JSON projection, and runtime lifecycle lookup. `ReferenceRefreshApplication` and `ReferenceMatchingApplication` already implement environment-neutral preparation and promotion protocols, but their caller and adjacent canonical behavior remain split across the runtime seam.

The runtime must preserve sixteen public Reference/Canonical operations and remain the sole owner of public maintenance admission, dispatch, cancellation, retry/continue, restart reconciliation, and terminal transitions. Durable schemas and historical store formats cannot change.

## Goals / Non-Goals

**Goals:**

- Give runtime callers one typed Reference application seam with high leverage.
- Concentrate Host paging, semantic projection, use-case ordering, canonical consistency, and verification in the application package.
- Preserve independently testable Refresh, Matching/Review, and Canonical Mutation internal seams.
- Make every durable write's promotion checkpoint explicit and remove Reference repository owner escapes.
- Replace old tests with behavior tests at the new seam while retaining focused wire and persistence adapter tests.

**Non-Goals:**

- Change public operation identifiers, wire DTOs, error vocabulary, schemas, durable formats, or maintenance lifecycle ownership.
- Merge the existing Refresh and Matching persistence protocols into a generic repository interface.
- Introduce a compatibility facade, alternative production execution path, automatic downstream rebuild, or new dependency.

## Decisions

### Use one grouped Reference application interface

The external interface groups `read`, `refresh`, `match_references`, `mutate_canonicals`, and `quiesce`. Each group accepts and returns closed typed semantic DTOs. This keeps the interface aligned with stable use-case families rather than current route names.

A two-method `query/execute` design was rejected because its request/result enums would become a second dispatcher whose variant pairing callers must learn. A method-per-route facade was rejected because it would mirror wire policy and turn route additions into interface growth.

### Keep three independent internal use cases and persistence interfaces

Refresh, Matching/Review, and Canonical Mutation retain separate modules and high-level persistence interfaces. Their atomic operations differ materially; combining their existing methods would create a broad repository-shaped interface. The canonical interface accepts typed aggregate reads and atomic mutation commands and never exposes repository owners, locks, transaction closures, SQL records, or generic CRUD.

The production repository adapter may implement all three interfaces, but each internal module sees only its own persistence knowledge. SQLite transaction mechanics remain in the adapter; validation, planning, idempotency semantics, and result projection remain in the application module.

### Put typed Host access and semantic projection behind the application seam

The application package owns `ReferenceHostPort`, Host request/response DTOs, cursor and snapshot validation, bounded page collection, artifact read planning, and failure-to-retry decisions. The runtime reverse-Host adapter owns capability names, transport, and wire conversion.

The application also owns record selection, effective Canonical Reference identity, ordering, ranking, pagination, attention/review meaning, and counts. Runtime routes only rebuild strict requests and encode compatible public responses.

### Require a per-call promotion checkpoint for every durable write

Every refresh, matching/review, literature, and Canonical Reference mutation call receives the existing application-level `PromotionCheckpoint`. The application invokes it immediately before each durable promotion and may use it for cooperative early stop between bounded batches.

The checkpoint remains a caller-provided question, not a lifecycle resource. Runtime code continues to resolve current operation identity, deadline, cancellation, and terminal compare-and-set. A constructor-injected lifecycle port was rejected because operation context is per invocation; application-owned admission was rejected because it would duplicate the public maintenance owner.

### Replace the old owner instead of layering facades

Implementation proceeds in vertical TDD slices, but production composition switches directly from the runtime owner to the application owner. The old runtime module and its Reference-specific repository escape are removed once routes and tests use the new seam. No forwarding wrapper remains.

## Risks / Trade-offs

- [Typed DTO migration accidentally changes wire shape] → Keep wire codecs in runtime, retain strict route tests, and compare the existing parity corpus.
- [Canonical persistence adapter absorbs domain rules] → Pass typed mutation plans into atomic adapter operations; keep validation and outcome projection in the application module.
- [The grouped interface becomes a route registry] → Add variants only to stable use-case-family commands and reject string or `Value` dispatch.
- [Checkpoint threading misses a write path] → Require it in every durable-write method and search for repository mutations without a checkpoint before completion.
- [Behavior tests are duplicated rather than moved] → Establish each behavior at the new interface, then delete the superseded owner/SQL assertions in the same slice.
- [A large file is merely relocated] → Separate canonical mutation implementation from the root orchestration while retaining existing Refresh and Matching modules.

## Migration Plan

1. Add the grouped interface, semantic DTOs, Host port, and a failing application-seam tracer test.
2. Move read projection and Host collection behind the seam while runtime codecs remain unchanged.
3. Add the canonical persistence interface and repository adapter operations, then migrate canonical behavior one vertical slice at a time.
4. Compose existing Refresh and Matching modules behind the root interface and thread per-call checkpoints through every durable write.
5. Switch production routes and parity execution to the new owner in one cutover.
6. Delete the runtime application, Reference repository escape use, and superseded tests.
7. Run application, repository, runtime, parity, formatting, and strict OpenSpec validation.

Rollback is source-level: before publication, revert the complete change. No data rollback or migration is required because durable formats are unchanged.
