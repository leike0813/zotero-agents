## Context

The current contract set closes many outer objects but reuses recursive `jsonValue` and `jsonObject` definitions inside domain fields. TypeScript has 66 `Promise<unknown>` production-port methods and 38 directly wide nested contract fields; Rust application DTOs expose 40 wide JSON fields and seven surface adapters manually read `Value` with empty defaults. The existing cross-language set covers six schema files and selected runtime/compute cases rather than the full protocol.

## Goals / Non-Goals

**Goals:**

- Make recursive shape—not outer-envelope shape—the contract completion criterion.
- Keep capability names, business behavior, persistence, and dependencies stable.
- Establish one auditable registry for 119 capabilities and 15 worker operations.
- Remove production generic DTO escape hatches after every caller is migrated.

**Non-Goals:**

- Change the 96-operation product surface or the 14 reverse-Host capability roster.
- Redesign Synthesis algorithms, database/canonical formats, runtime concurrency, release, or prebuild behavior.
- Preserve undocumented aliases or missing-field defaults.

## Decisions

### JSON Schema 2020-12 remains the language-neutral SSOT

A new `synthesis-sidecar-protocol-v1` contract set owns the registry, schemas, and corpus. TypeScript and Rust remain hand-authored but must project the same positive and negative corpus. Code generation was rejected because it adds tooling and generated-file policy before the repository has established a stable schema authoring convention.

### One registry references existing rosters

The registry references the existing production and reverse-Host rosters and records only their DTO mappings. Checkers compare both directions so the registry cannot silently fork capability names.

### Recursive closure is graph-validated

The checker walks every request/result/error `$ref` transitively. Objects require closed keys, arrays concrete items, and unions discriminators. Generic JSON is accepted only at an explicit opaque leaf with owner, version/codec, capacity, and integrity constraints.

### Transport parsing and domain decoding are separate

HTTP, worker, and reverse-Host codecs may initially parse bytes to JSON, but capability dispatch immediately rebuilds a concrete DTO. Rust domain ports and TypeScript public ports never receive raw JSON containers.

### Migration is strict and atomic

Each protocol family is implemented and tested in waves, but the final change removes all aliases and defaults together. Output-transfer `rootSha256` changes atomically across producer, consumer, mocks, and fixtures.

### Mainline source is the behavior baseline

Behavioral decisions are fixed to `main@e210997a11e0054a3cb4ae0656e5cfb96102a09c`. Source, callers, and tests at that identity take precedence when executable comparison fixtures disagree. The Node oracle may expose a mismatch, but it is supporting evidence only: no DTO field, default, alias, side effect, or durable-state rule may be added or removed solely to make the oracle green.

## Risks / Trade-offs

- **Hidden callers rely on defaults or aliases** → Capture current valid callers in positive corpora first; reject only behavior absent from the formal corpus and current grouped client.
- **A single schema set becomes large** → Split schemas by existing seven client surfaces plus reverse-Host, transfer, worker, control, lifecycle, bundle, and observability while keeping one registry.
- **Opaque content reintroduces an escape hatch** → Require explicit allowlisting and fail recursive traversal for any generic leaf outside it.
- **Application parity already has unrelated failures** → Require no new mismatch and close DTO mismatches here; keep unrelated durable-state drift visible rather than allowlisting it as DTO compatibility.

## Migration Plan

1. Add failing completeness and recursive-closure checks plus baseline positive corpora.
2. Migrate the 96 client operations by surface family.
3. Migrate reverse-Host, transfer/worker, and system/lifecycle families.
4. Switch output locators atomically to required root binding.
5. Remove old contract set and production generic bridges only after 119+15 mapping is green.
6. Validate focused routes, Rust workspace, TypeScript contracts, OpenSpec, and existing surface gates before handoff.
