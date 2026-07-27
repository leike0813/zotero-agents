## Context

The accepted R9a route gives all production consumers one generation-scoped
native `SynthesisClient`. The plugin nevertheless retains a second complete
implementation:

- `synthesisClient/legacyComposition.ts` constructs the old service, repository,
  engines, Host adapters, and grouped client;
- `synthesis/service.ts` and `synthesis/repository.ts` own the old application
  and production persistence path;
- `synthesisClient/inProcessClient.ts` contains both a useful generic
  flat-port-to-grouped-client adapter and naming/assumptions associated with the
  retired in-process owner;
- the readonly harness still constructs the legacy composition over readonly
  SQLite adapters;
- static boundary checks deliberately allow these oracle/harness paths.

Deleting these files indiscriminately would also delete the grouped adapter
used by `nativeComposition.ts` and could remove plugin-owned Host adapters or
pure projections that remain valid. This change therefore separates the
neutral seam first, proves no legacy caller remains, and then deletes only
owner-specific code.

`apps/synthesis-service` remains a physically separate differential oracle
during this change. It is removed by the dependent
`remove-synthesis-node-sidecar-stack` change. No release is allowed between the
two deletion changes.

## Goals / Non-Goals

**Goals:**

- Remove every plugin-side factory and implementation capable of owning the
  Synthesis production database, canonical root, application state, or engine
  orchestration.
- Preserve the 96-method grouped public client over the 95-operation native
  port without duplicating method mapping.
- Keep all production consumers native-only and fail closed.
- Preserve Zotero UI, reverse-Host, export/WebDAV delivery, item/tag effects,
  localization, DTO reconstruction, and other plugin-owned responsibilities.
- Keep the readonly harness useful without constructing a Synthesis owner or
  writing live roots.
- Replace allowlisted legacy reachability with a zero-construction invariant.

**Non-Goals:**

- Delete the external Node sidecar, JavaScript worker stack, Node-specific
  build workflow, Node package workspace, or executable differential scripts.
- Delete `packages/synthesis-contracts`.
- Blindly delete all of `packages/synthesis-engine`,
  `packages/synthesis-application`, `packages/synthesis-repository`, or
  `src/modules/synthesis`.
- Change public client DTOs, capability names, database/canonical formats,
  reverse-Host authority, or cutover receipt semantics.
- Redesign the readonly harness UI or make it depend on a running Zotero
  process or production native owner.

## Decisions

### 1. Extract one neutral client-port adapter before deletion

The reusable content of `inProcessClient.ts` will move to a neutrally named
module such as `clientPortAdapter.ts`. It owns:

- the closed `SynthesisClientPort` interface aligned with the 95-operation
  contract;
- reconstruction of the 96-method grouped `SynthesisClient`;
- stable error/result mapping and JSON-safe DTO rebuilding;
- no database, canonical, Host, service, engine, lifecycle, or transport
  construction.

`nativeComposition.ts` imports this adapter. Tests that need a client use a
bounded fake port, not a legacy service. The old filename and in-process factory
are then deleted.

Alternative: keep `inProcessClient.ts` because its code works. Rejected because
the name and exported factory preserve the conceptual route that R9b is
retiring, and future callers could mistake it for an approved owner.

Alternative: duplicate the mapping inside `nativeComposition.ts`. Rejected
because it creates a second 95-operation mapping and weakens the exact inventory
gate.

### 2. Classify plugin modules by ownership, not directory

Before deletion, a code-graph impact pass and static import inventory will
classify every candidate:

| Class | Action |
| --- | --- |
| legacy composition/service/repository/owner factory | delete |
| legacy-only domain orchestration or engine adapter | delete after zero-caller proof |
| neutral grouped client/DTO reconstruction | keep in the neutral adapter |
| reverse-Host and Zotero effect/read adapters | keep |
| UI model, localization, item observer, Workbench bridge | keep |
| pure canonicalization/projection with current plugin callers | keep |
| test helper that constructs legacy owner | replace with fake port or readonly projection |

No whole-directory removal is authorized without the per-file reachability
inventory. Unreachable code found during implementation is deleted rather than
wrapped in compatibility exports.

### 3. Keep the readonly harness local and ownerless

The harness must continue to run without Zotero and without a production native
service. It will use dedicated readonly snapshot/query adapters for its
Workbench surfaces and a fake/readonly grouped client only where the reused UI
requires the public facade.

The harness:

- reads stable copied SQLite snapshots under its existing readonly rules;
- may use pure DTO/projection helpers;
- cannot open production write adapters, canonical writers, live owner locks,
  reverse-Host effects, WebDAV credentials, or native mutation routes;
- returns explicit unavailable/blocked results for unsupported commands;
- logs mocked writes without executing them.

Alternative: launch the production native service for the harness. Rejected
because the harness contract does not require Zotero and must not acquire a
production owner.

Alternative: retain legacy composition only for harness use. Rejected because
it preserves a complete second owner and prevents a zero-construction gate.

### 4. Convert the boundary gate from allowlist to absence proof

The service-boundary checker will no longer expect one direct legacy consumer
or allow `legacyComposition.ts`/harness factories. It will prove:

- forbidden legacy filenames, symbols, dynamic import strings, and owner
  factories are absent;
- production and harness source cannot open Synthesis production DB/canonical
  roots except approved cutover backup/restore and native supervisor adapters;
- default client, Workflow, Workbench, Host Bridge, MCP, startup, maintenance,
  and shutdown import only the native composition/client lifecycle;
- no preference, environment variable, manifest field, test hook, or backend
  registration selects an implementation;
- retained external Node source is reachable only from the explicitly
  development-only paths owned by the next change.

Negative fixtures will prove the checker catches static imports, dynamic
imports, factory aliases, direct root openers, and an implementation toggle.

### 5. Remove legacy lifecycle duties instead of preserving adapters

Default-client invalidation and shutdown continue to dispose a
generation-scoped native composition and then stop reverse Host/supervision in
the accepted ownership order. Legacy service debounce, WebDAV application
drain, cached default service, repository close, and engine cancellation duties
are removed from plugin lifecycle because their owner no longer exists.

Equivalent native service/worker drain remains governed by Rust lifecycle and
the native supervisor. No no-op legacy lifecycle facade is retained.

### 6. Test stable behavior and absence boundaries

TDD work extends existing client lifecycle, production route, consumer,
readonly harness, boundary, cutover, and shutdown tests. Assertions target:

- public client behavior and stable error categories;
- one native composition per generation;
- no legacy factory call or production root open;
- owner-safe cleanup order;
- readonly harness output and blocked effects;
- source/build absence invariants.

Tests that exist solely to inspect legacy internal classes or private call order
are deleted with the implementation. Cross-language/public corpora remain.

## Risks / Trade-offs

- **Neutral adapter extraction changes all client calls at once** → Move the
  existing mapping without semantic edits first, run exact inventory/client
  tests, then delete legacy exports.
- **A plugin-owned Host adapter is mistaken for legacy business logic** → Use
  the ownership classification and caller/impact evidence; retain bounded Host
  adapters even when their former composition root is deleted.
- **Harness loses useful surfaces** → Preserve observable readonly surfaces
  through dedicated snapshot/query adapters and explicitly report unsupported
  mutations.
- **Tests pass while dynamic legacy construction remains** → Scan static and
  dynamic imports, factories, toggles, root openers, and negative fixtures.
- **External Node oracle temporarily remains** → It is still production
  unreachable, frozen, and assigned to the next change; no release is permitted
  at this intermediate state.
- **Large deletions hide unrelated behavior changes** → Separate neutral
  extraction, harness migration, zero-caller deletion, and verification into
  ordered task groups.

## Migration Plan

1. Verify the prerequisite retirement-baseline change and its accepted
   pre-deletion evidence.
2. Extend existing tests and negative fixtures for neutral adapter parity,
   harness ownerlessness, zero legacy construction, root isolation, and native
   lifecycle.
3. Move the grouped client-port adapter and switch native composition/tests to
   it without changing public behavior.
4. Migrate the readonly harness to dedicated readonly snapshot/query adapters.
5. Generate the owner-specific reachability inventory and delete
   `legacyComposition.ts`, the old service/repository, owner factories, and
   zero-caller plugin modules.
6. Remove legacy lifecycle hooks, exports, mocks, and implementation-detail
   tests.
7. Strengthen static boundaries and run focused client/harness/cutover tests,
   Stage-1 tests, TypeScript checks, Rust gates, and production build.
8. Update current-state docs to show Rust as the sole production owner while
   explicitly listing the still-retained external Node oracle.
9. Continue directly to `remove-synthesis-node-sidecar-stack`; do not release
   the intermediate tree.

Rollback before merging this change is source rollback. There is no data
migration. Runtime rollback after R9a remains compatible-Rust-only; reintroducing
the plugin owner is not a supported recovery mechanism.

## Open Questions

None. The neutral adapter boundary, harness strategy, per-file deletion rule,
zero-construction invariant, and dependency on the final Node retirement change
are fixed.

