## Context

See `proposal.md`. The affected paths already have mature owners and test seams; the design keeps public DTOs and module boundaries intact. The only persistent-format change is Topic path identity/repository foundation. Zotero plugin code cannot depend on Node-only APIs.

## Goals / Non-Goals

**Goals:**

- Close confirmed trust-boundary and lifecycle gaps at their existing shared owners.
- Make filesystem replacement and Topic identity migration recoverable and deterministic.
- Preserve current public contracts except for the declared Topic path schema change.
- Keep generated deep-reading files byte-for-byte derived from their checked-in source.

**Non-Goals:**

- Reintroducing Topic Synthesis audit artifacts.
- Adding dependencies, compatibility layers, release binaries, or new public capabilities.
- Changing Assistant Workspace wire DTOs, region signatures, or transcript ownership.

## Decisions

### Header-first Host admission

The existing asynchronous reader becomes a two-phase operation: parse a small bounded head, pause, then continue only with a server-selected body limit. The server authenticates and classifies the route between phases and caps live accepted connections at 16. This reuses the current reader and listener rather than adding a proxy or second server.

Master-token decryption is cached by encrypted envelope plus key material, including one in-flight promise. Rotation changes the cache key. MCP keeps established aliases but projects all other Broker errors through the existing structured tool-error builder.

### Reuse existing limits and lifecycle owners

Archive extraction imports the existing `WORKFLOW_ARCHIVE_LIMITS`; no second quota model is introduced. ACP timeout races share one timer-clearing helper. Pending permission promises are owned and cancelled by the connection adapter on close or final listener removal. Publication `flush()` loops on the existing pending map until no tail work remains.

### Recover stored attachment swaps before service admission

The native mutation owner writes a small phase journal under the existing runtime state directory and serializes replacement/recovery through one process-local tail. Startup recovery runs after persistence initialization and before Host services are installed. It validates every managed path, compares journal facts with current native metadata, then either restores old bytes, completes committed new bytes, or fails closed with `repair_required`. Ambiguous evidence is preserved.

Alternative considered: rely on operation receipts and in-process compensation. Rejected because neither survives a process stop between filesystem and metadata effects.

### Topic path v2 is identity-bearing

Both languages compute at most 15 normalized slug characters plus the full SHA-256 of canonical Topic identity; non-sluggable IDs use the full hash. The shared Rust protocol crate owns the formula and the canonical store re-exports it for existing callers. Repository foundation v6 migrates stored current path fields transactionally.

Canonical startup scans active historical `topics/*/current` roots, validates old formula and embedded identity, then uses the existing staged promotion/journal machinery. Old bytes remain until v2 verifies; conflicting v2 content fails closed. Live reads no longer probe old formulas after startup.

Alternative considered: append a short hash. Rejected because the full hash stays within the existing 80-character bound and removes avoidable collision policy.

### Keep minimal-runtime and generated-source truth explicit

The stale Topic Synthesis skill requirements are corrected to agree with the already-canonical minimal runtime. Deep-reading runtime/template fixes are made in `skills_src` and regenerated with the existing renderer; a public generation test compares the complete generated file map.

## Risks / Trade-offs

- [Two-phase reads may expose ordering bugs in stream mocks] → Extend the existing reader and real-server tests, including abort and excess-connection paths.
- [Attachment recovery could touch an unrelated path] → Require exact managed-root relationships and fail closed without moving or deleting ambiguous evidence.
- [Topic migration may encounter pre-existing collisions or partial copies] → Verify Topic identity and basis on both roots and preserve both on mismatch.
- [Repository v6 migration and canonical-root promotion could diverge] → Perform both during locked startup and reject runtime admission until both validate.

## Migration Plan

1. Ship TypeScript and Rust path formula plus repository v5-to-v6 migration together.
2. Under the existing production lock and backup, migrate database path fields and promote supported historical current roots.
3. Publish readiness only after current repository and canonical roots validate.
4. On failure, retain the backup and old canonical bytes; startup remains closed until explicit recovery/correction.
