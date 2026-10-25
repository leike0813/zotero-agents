# Design

## Context

See proposal.md for the failure sequence. Mock resets recreate API objects but retain class prototypes. Toolkit construction patches item methods before failing on absent native capabilities. Windows zero-delay timers also cost about 15 ms per batch in the 56,000-source scan fixture.

## Goals / Non-Goals

**Goals:** Restore test isolation and make the existing application shard pass with current contracts.

**Non-Goals:** Change plugin scheduling, native reset ownership, result schemas, dependencies, or runner output policy.

## Decisions

- Capture descriptors of shared mock class prototypes before first use. Reset removes new own keys and restores baseline descriptors, preserving constructor identity and instance relationships. Replacing classes or suppressing toolkit construction would leave other prototype mutations untested.
- Regress through reset and observable field operations, including a real FieldHookManager hook. Small mutation cases cover accessors, deleted members, and symbols without requiring a thousands-deep call stack to hang.
- Scope a zero-delay scheduler substitute to the large Index case: setImmediate retains real event-loop turns, while nonzero timers retain their original behavior. Pair cancellation with cleanup and restore both timer functions in finally. Dataset size and assertions stay fixed; increasing timeouts would preserve Windows scheduling dependence.
- Manifest fixtures use the existing schema's grouped papers and matching flat artifacts. Update the sibling Host Bridge fixture too; its total is also missing. Error-only fixtures need no change.
- Check production root openers by store type: Repository only in runtime_service.rs, CanonicalStore in runtime_service.rs or runtime_reset.rs. Reuse a pure script matcher in the file scanner and table-driven boundary cases, retaining rejection elsewhere. Rust recovery remains unchanged.

## Risks / Trade-offs

- Shared setup affects all Node shards → verify isolation cases, the application shard, related bridge behavior, and one full Node run.
- Global timer substitutes could leak or mis-handle cancellation → keep them local to one case, track immediate handles, and restore in finally.
- Recovery exceptions could weaken ownership checks → allow only canonical reopening in the exact reset module; keep repository opens forbidden there.

## Migration Plan

No persisted data or runtime migration. Apply test/tooling changes together and retain the normal shard entrypoint for acceptance.
