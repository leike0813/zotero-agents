## Context

See `proposal.md` for motivation. `runtimePersistence` already proves the cross-runtime filesystem seam, while `runtimeBridge` and `filePicker` contain overlapping candidate knowledge and many production callers still select adapters locally. Native ZIP, SQLite, script-loader, streaming, picker, attachment, and diagnostic workloads require semantics that ordinary file operations intentionally hide.

The fixed baseline is `4dbddc24e884921262c559428bf851db5eadf2d7`. Contract foundation change `01-establish-workflow-host-v12-contract-foundation` must be complete first. This change does not alter the Workflow Host member manifest.

The authoritative architecture source is [`artifact/workflow-host-v12-architecture-decisions.md`](../../../artifact/workflow-host-v12-architecture-decisions.md), especially §§4.5, 13, 14.8, 18, and 19. Its closed exception inventory, late-binding rules, owner boundaries, and validation matrix take precedence over abbreviated wording in this design.

## Goals / Non-Goals

**Goals:**

- Make ordinary asynchronous filesystem selection a production-wide SSOT.
- Preserve strict and tolerant callers through one late-bound adapter implementation.
- Separate general runtime/Window resolution from picker policy.
- Make native exceptions closed, local, reviewable, and testable.
- Remove duplicate selectors after replacing their observable behavior at the owner interfaces.

**Non-Goals:**

- Forcing ZIP, SQLite, native streaming, script evaluation, picker, or attachment creation through a path-only filesystem interface.
- Creating a universal runtime facade or exporting native objects.
- Moving command, subprocess lifecycle, or domain policy into runtime persistence.
- Changing Workflow Host version or public shape.

## Decisions

### Runtime persistence owns operations, not domain policy

Extend `src/modules/runtimePersistence.ts` with the minimum semantic operations needed by existing callers. Callers keep path naming, retention, product lifecycle, and domain outcomes. This avoids a shallow wrapper per caller while preventing runtime adapter selection from spreading again.

### Resolve adapters for every invocation

Factories and cached projections capture callbacks, never IOUtils, OS.File, Node modules, Zotero globals, Windows, or picker constructors. Each operation resolves current capability shape. Dispatch by `Zotero.version` is prohibited because capability availability, not labels, defines compatibility.

### Runtime bridge feeds picker through a one-way dependency

`src/utils/runtimeBridge.ts` returns current general candidates and isolates failed candidates. `src/platform/filePicker.ts` chooses a picker-compatible live parent, selects native/toolkit adapters, applies filters, and normalizes cancel, empty, and multi-selection results. A third facade was rejected as duplicated indirection.

### Native workloads remain an explicit exception set

Each exception maps to a named owner and an interface test. Ordinary path/byte operations inside the same module still use runtime persistence. Governance scans exclude `test/**`, `scripts/**`, `tools/**`, and `src/modules/harness/**`, but include production Node adapter branches.

### Replace shallow tests with owner-interface evidence

Tests that only assert helper existence, re-export identity, or fallback call order are deleted when equivalent observable behavior is covered at the deep module interface. Tests do not assert native import URLs, toolkit constructor arguments, or internal candidate order.

## Risks / Trade-offs

- [Large caller migration obscures behavior drift] → Migrate by caller family after owner tests pass and record focused results per family.
- [Exception allowlist becomes an escape hatch] → Require a named owner, stable evidence, and zero unauthorized governance findings.
- [Strict and tolerant semantics converge accidentally] → Share adapter mechanics but keep explicit public functions and behavior tests.
- [Late binding adds repeated resolution cost] → Candidate resolution remains bounded and side-effect-free; correctness takes priority over retaining stale runtime state.
- [Overlap with subprocess companion] → This change owns filesystem/runtime/Window/picker only; one-shot process behavior belongs to `02p-consolidate-platform-subprocess-one-shot-seam`.

## Migration Plan

1. Add failing owner-interface tests for strict/tolerant, atomic, Unicode, unavailable, picker, candidate, and per-call late-binding behavior.
2. Complete runtime-persistence operations and bridge/picker ownership before migrating callers.
3. Migrate ordinary-I/O callers by workflow, runtime, installer/transfer, provider, and ACP families.
4. Remove approved shallow selectors and replace helper-level tests with interface evidence.
5. Run governance scans, focused suites, Node/Zotero workflow tests, type checks, lint, and build.

Rollback reverses caller families and owner additions together; it does not change persisted schemas or release identity.
