## Context

The default Synthesis composition has no mirror adapter, and no client, Workbench, Host Bridge, MCP, or workflow consumer exposes the three mirror methods. Canonical apply/delete/purge already run without mirror writes, while newer foundation requirements prohibit normal runtime mirror persistence. The remaining adapter is the last direct Zotero implementation in `service.ts`; mirror codecs, recovery planning, and UI states exist only to support that dormant slice or tests for it.

## Goals / Non-Goals

**Goals:**

- Remove the dormant Topic mirror public surface and direct Zotero implementation from the application service.
- Remove mirror-only codecs, manifests, recovery inputs/actions/results, and synthetic UI storage fields.
- Preserve canonical Topic transactions and the non-mirror root/index/conflict/startup recovery model.
- Align main specs, inventory, documentation, and tests with current runtime ownership.

**Non-Goals:**

- Reading, deleting, rewriting, or migrating existing Zotero anchor/shard items.
- Adding replacement Host read/effect ports or a one-shot migration utility.
- Changing canonical Topic files, SQLite, Git/WebDAV Sync, Topic commands, dependencies, or the final legacy composition consumer.

## Decisions

### Retire instead of porting the mirror

Delete `refreshMirror`, `rebuildMirrorFromCanonical`, and `recoverCanonicalFromMirror` rather than wrapping them in new Host ports. A useful replacement would require both a bounded write/effect port and a separate migration-only shard read port, but no production caller currently needs either. Adding those abstractions would reactivate a persistence path that current foundation requirements explicitly disable.

### Leave legacy Zotero data inert

Runtime code will not discover or clean up old anchors and notes. This makes the retirement non-destructive and avoids inventing migration policy. Any future recovery tool must be a separate explicitly confirmed change with its own path/hash validation and temporary-root promotion.

### Remove mirror-only primitives at their SSOT

Delete shard envelope/manifest codecs from `foundation.ts`, the payload source builder and adapter from `service.ts`, and mirror validation/recovery planning from `syncRecovery.ts`. Keep `SynthesisConflictCandidate`, root/index assessment, local conflict actions, and startup preference checks in `syncRecovery.ts` because the service still consumes them.

### Shrink DTOs with the runtime surface

Remove optional `mirror`/`mirrorError` service result fields, mirror input/result fields from sync recovery, and `anchorState`/`mirrorState` from Workbench storage. These values are not populated by production and have no UI consumer; retaining permanent `missing` placeholders would preserve false state.

### Update inventory as a deliberate breaking change

Delete the `topic_mirror_commands` and `legacy_mirror_recovery` inventory groups. The boundary check becomes `125 methods / 1 direct consumer`; no replacement client capability is introduced.

## Risks / Trade-offs

- [A user may still have legacy mirror notes] → Leave every Zotero item untouched and document that normal runtime ignores them.
- [Old specs imply disaster recovery from shards] → Replace those requirements with canonical-only and non-mirror recovery semantics in the same change.
- [Removing fields can expose hidden consumers] → Use repository-wide symbol search, TypeScript, Core regressions, Host Bridge/client tests, and production build before completion.
- [Recovery cleanup could accidentally remove active local behavior] → Keep root binding, local index rebuild, conflict candidate normalization/actions, startup preference, and their focused tests.

## Migration Plan

1. Update boundary and behavior tests to describe the retired surface.
2. Remove service mirror methods/types/adapter and all mirror-only foundation/recovery code.
3. Remove dead UI storage projection fields and inventory entries.
4. Update current-state specs and documentation, then run strict validation and regression gates.
5. Rollback is code-only; no user data or schema is changed.

## Open Questions

None.
