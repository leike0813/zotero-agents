## Context

Canonical redirects are stored as one outgoing row per physical canonical, but read paths independently follow those rows and write paths do not share a complete-graph invariant. Review transitions express raw edge changes, so reversing an open duplicate can add the inverse of a fact owned by an accepted sibling. Durable import can also write redirect rows through a generic SQL path. See `proposal.md` for the production failure motivating the change.

The repository is the only production persistence owner. Workbench reads must remain side-effect free, and a supported prior production database must be backed up and migrated before normal application composition.

## Goals / Non-Goals

**Goals:**

- Give redirect resolution, component operations, validation, and repair one implementation.
- Preserve every member of a merged component while changing its representative.
- Make explicit review decisions authoritative without requiring conflict decisions from users.
- Repair supported existing databases and imported bundles deterministically and audibly.

**Non-Goals:**

- Re-evaluate whether canonicals in an existing component represent the same scholarly work.
- Run heavy reference matching during startup or import.
- Add UI controls, public RPC operations, or user-facing repair prompts.
- Change raw reference or canonical identifiers.

## Decisions

### Model redirects as a functional rooted forest

A repository-owned pure graph module will build a map from `from` to `to`, resolve roots, identify weak components and cycles, and produce minimal edge rewrites. Reads in Reference Index and Citation Graph will use the same resolver.

For a normal merge, the source component root points to the target component root. For reverse accept, the source physical canonical becomes the preferred root: its current outgoing edge is removed and the former component root points to it. This preserves a long chain such as `A -> B -> C` as `B -> C -> A` rather than detaching `C`.

Raw edge insertion with post-hoc rejection was rejected because it cannot preserve a component when rerooting a chain. Read-time repair was rejected because Workbench reads are required to remain pure.

### Keep intent in the application and the invariant in the repository

Review planning will express merge or preferred-root intent plus audit/proposal changes. Repository transactions will materialize the intent against current facts, update displaced proposal states, validate the final graph, update readiness, and store the receipt atomically.

All lower-level redirect entry points will validate their final prospective graph. This defense covers matcher promotion, revision/manual merge, review, migration, and import even if a caller regresses.

### Treat proposals as durable audit with current derived-fact state

When rerooting removes an edge, accepted proposals describing exactly that removed edge become `superseded`; the new explicit audit remains accepted. Open proposals whose endpoints are already in the settled component also become superseded. Records remain stored for provenance.

New redirect facts will use reasons that distinguish automatic matching, accept, reverse, retarget, canonical revision, and repair. Existing rows are ranked using accepted proposal reasons when their generic historical reason is insufficient.

### Repair cycles with a deterministic preferred root

For each cyclic component, recovery selects a root in this order: newest explicit reverse/manual-target audit; accepted binding; accepted automatic target; stable canonical identifier. It removes the selected root's outgoing edge, which breaks the cycle without changing component membership. Ties and incomplete provenance are recorded in diagnostics.

A dedicated internal redirect-graph migration identity advances to v1 so the repair runs once under the existing production backup and migration protocol without changing the cross-language repository foundation v2 contract. The repair writes a completed operation receipt and marks Citation Graph and related-items state stale. Reopening the repaired database is idempotent.

### Normalize durable imports before commit

The generic entity application can remain for unrelated records, but redirect entries will be accumulated and the full prospective graph normalized before the import transaction commits. Imported proposal facts participate in root precedence. Any local normalization remains visible to later durable capture rather than being represented as remote state that never existed.

## Risks / Trade-offs

- **A legacy cycle may lack enough provenance to recover the historically intended representative.** The fallback changes only the representative, preserves all component members and audit rows, and records the decision.
- **Superseding redundant proposals changes review counts.** This is intended: those rows no longer require a user decision, while their history remains queryable.
- **A shared graph module adds an allocation when constructing the map.** Current redirect bounds are already materialized in memory; one indexed map replaces repeated linear searches and improves worst-case resolution cost.
- **A failed migration could prevent startup.** The existing pre-migration backup remains the rollback source, and the migration transaction commits only after final graph validation.

## Migration Plan

1. Register the internal reference redirect graph v1 migration under the current production migration/backup protocol.
2. Build the graph and repair every cyclic component in the migration transaction.
3. Supersede proposal facts for removed edges, write one bounded repair receipt, and mark dependent projections stale.
4. Commit the internal migration identity only after the repaired graph validates.
5. On rollback, restore the pre-repair production database backup together with the prior binary; no reverse migration is attempted.
