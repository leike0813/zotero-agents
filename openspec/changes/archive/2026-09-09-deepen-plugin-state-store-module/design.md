## Context

See [proposal.md](./proposal.md). `pluginStateStore.ts` currently owns the correct process-wide storage seam and the single `state/zotero-agents.db` lifecycle, but table knowledge is split among centralized DDL, a SQL-text-parsing Map adapter, row normalization, and public CRUD functions. Production callers already approach the store through stable domain modules, while the readonly Harness intentionally uses an independent read-only projection.

The implementation must preserve guarded Zotero mozStorage access, schema and index bytes, legacy marker ordering, ACP/SkillRunner table separation, mutation insert-winner semantics, and all existing public exports. Node-only modules must never enter the plugin bundle.

## Goals / Non-Goals

**Goals:**

- Keep one deep Plugin State Store interface while concentrating each table family's DDL, codecs, SQL, and atomic operations.
- Execute the same SQLite statements in Zotero and Node tests.
- Keep adapter selection, initialization, transactions, and cross-family migration ordering under one process-wide owner.
- Preserve behavior tests at the existing public store and domain interfaces.

**Non-Goals:**

- Change tables, indexes, database paths, public DTOs, errors, caller imports, or persisted data.
- Move Runtime Persistence Governance policy, Zotero Host mutation lifecycle, sequence state semantics, or literature migration classification into the store.
- Add a query DSL, ORM, repository interface, dynamic table registry, compatibility path, dependency, or Node fallback to production code.
- Reuse the production write implementation in the readonly Harness.

## Decisions

### One public root and four private table families

`src/modules/pluginStateStore.ts` remains the public interface and composition owner. It owns runtime selection, path helpers, the guarded Zotero adapter, lazy state, and disposal. A private `pluginStateStore/core.ts` owns the small SQL adapter contract, test-adapter factory, and common normalization.

Four sibling modules own the task, run/sequence, mutation-authority, and literature-migration table families. Each exposes only fixed schema statements and focused storage operations to the root; callers cannot import them through a barrel. The root binds and exports those operations so existing imports, normalization, return shapes, and errors stay stable.

The root owns the fixed schema order, `plugin_meta`, legacy-pref clearing, separated-run reset, cross-family transactions, test inspection, and initialization publication. Private family modules receive the selected SQL adapter and never open connections or select runtimes.

Alternatives rejected: one file per table creates shallow modules; grouping by CRUD operation preserves poor locality; moving all implementation behind a re-export-only index violates ADR 0001 and fails the deletion test.

### Node SQLite replaces the Map SQL interpreter

The test suite installs a Node-only adapter factory from `tests/setup/zotero-mock.ts`. Each factory invocation opens a fresh `node:sqlite` `DatabaseSync(":memory:")` and implements the existing `run/all/get/transaction` contract. Reset disposes the active database but retains the factory so the next public store call receives a clean database.

Runtime selection is fail-closed and ordered: a valid Zotero `Services.storage` plus `Zotero.File` selects the guarded production adapter; otherwise an explicitly installed test factory is required. Production source contains no `node:sqlite` import. Existing tests that temporarily install `Services.storage` continue to exercise the production adapter.

The alternatives were paired SQLite/Map implementations in every family and a typed selector compiled by two adapters. The first duplicates every behavior; the second builds a private query engine almost as broad as SQL. Native SQLite removes both costs and fixes Map-only composite-key and transaction drift.

### Existing interfaces are the test surfaces

The primary test seam is the public `pluginStateStore.ts` interface; existing ACP, SkillRunner, sequence, mutation-authority, literature-migration, governance, and readonly-Harness interfaces remain secondary behavior seams. Private family modules, SQL text, file layout, and internal call order are not asserted.

The tracer regression stores two logically distinct composite keys whose values collide under the current `"::"` Map encoding, then reads both through the public interface. It fails before the adapter replacement and passes with SQLite. The remaining extraction is a behavior-preserving refactor under the existing green tests.

### Node 24 is explicit tooling input

`package.json` declares Node 24 or newer, with matching root lock metadata. CI and release validation pass `node-version: 24` to their existing `setup-js` steps; no second setup or install step is added. Other release-specific toolchain recipes remain untouched.

## Risks / Trade-offs

- [Moving SQL changes schema or ordering] → Move statements byte-for-byte with their family and compare schema/index lists before and after.
- [Node and mozStorage bindings differ] → Keep the adapter contract SQL-shaped, reuse named parameters, and retain existing production-adapter busy/binding tests.
- [Reset leaks in-memory databases] → Give only test adapters a close hook and dispose the active adapter before clearing lazy state.
- [Cross-family migration becomes partially committed] → Keep migration orchestration in the root and pass one adapter through the existing transaction.
- [Private modules absorb domain policy] → Limit them to stored-row normalization, SQL, counts, receipts, and atomic persistence primitives.
- [Node-only code enters the plugin] → Place `node:sqlite` imports under `tests/` and inspect the built output.

## Migration Plan

1. Add the public composite-key regression and confirm it fails against the Map adapter.
2. Add the explicit Node SQLite test adapter, switch Node setup to it, remove the Map interpreter, and make the regression plus store baseline green.
3. Extract task, run/sequence, mutation-authority, then literature-migration families, running focused behavior tests after each slice.
4. Consolidate remaining initialization and migration composition in the root/core without changing schema or data.
5. Update documentation and Node toolchain declarations, then run focused tests, type/build/lint checks, bundle inspection, strict OpenSpec validation, and change verification.

Rollback is a normal source revert. There is no database migration, feature flag, compatibility path, or release step.
