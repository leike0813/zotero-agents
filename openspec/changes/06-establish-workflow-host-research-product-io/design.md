## Context

See `proposal.md` for motivation. The existing Research Bundle service already owns paper materialization, but v12 adds graph import and formal file/archive/resource modules. Correct import spans Zotero identities, managed resources, dependency ordering, relations, partial success, and compensation. Ordinary filesystem selection is supplied by change `02-deepen-workflow-host-runtime-adaptation-v12`.

The fixed baseline is `4dbddc24e884921262c559428bf851db5eadf2d7`. Contract foundation and runtime adaptation must be complete before this change is applied.

The authoritative architecture source is [`artifact/workflow-host-v12-architecture-decisions.md`](../../../artifact/workflow-host-v12-architecture-decisions.md), especially §§12.13–12.19, 13, 17, 18, and 19. Its graph consistency, target mapping, partial-success, resource lifetime, file/archive boundaries, budgets, compensation, and recovery requirements take precedence over abbreviated wording in this design.

## Goals / Non-Goals

**Goals:**

- Hide paper materialization and graph-import orchestration behind two Research Bundle members.
- Make partial success consistent at SCC group boundaries.
- Give file, archive, and resources distinct deep modules with explicit lifetimes.
- Reuse existing workflow-format and Product policies without duplicating adapter logic.

**Non-Goals:**

- Heuristic target discovery, automatic mutation of existing targets, or cross-process resume.
- A generic graph-mutation facade or a second mutation ledger.
- An opaque path registry, public archive-entry handles, or remote local paths.
- Moving workflow manifest/format policy into the Zotero import owner.

## Decisions

### Research Bundle import owns the graph, not a call sequence

`src/modules/researchBundleService.ts` gains a pre-bound importer that validates the complete request, creates a normalized graph, resolves explicit targets, computes SCCs, schedules ready groups, stages resources, performs Host effects, binds relations, verifies final state, and returns per-paper outcomes. It may use internal Broker/handler primitives but callers cannot reproduce the orchestration through public low-level calls.

### SCCs define the consistency unit

Papers in one cycle are admitted and compensated as a group. Independent groups can commit separately. Dependency failure blocks dependents with explicit evidence but does not roll back unrelated committed groups. Result ordering follows request paper order, not scheduler execution order.

### Existing targets are reuse-only

Target mapping is a closed create/existing union. Existing targets are fresh-read and kind/library validated. Import may add only explicitly requested child resources or relations and records those effects; it does not rewrite parent metadata or infer targets from bibliographic similarity.

### File archive and resources remain separate modules

The file module exposes trusted local path operations backed by runtime persistence. The archive module owns ZIP validation, measurement, atomic write, extraction scope, and cleanup, including native ZIP seams. The resources module owns run/slot identity, allocation, publication, listing, and cleanup. Combining them was rejected because their lifetimes and invariants differ.

### Materialized resources freeze bytes for the run

Materialization copies or generates accepted sources into managed run scope and returns immutable resource refs. Later changes to Zotero attachments do not alter the materialized bytes. Source graphs use logical paths and provenance only.

### Accepted import effects reuse canonical evidence

Import groups use the mutation authority's receipt/attempt data model where Host effects require confirmation, without inserting research operations into the eleven generic mutation union. Failed rows reference canonical attempt identities rather than copying error payloads.

## Risks / Trade-offs

- [Graph validation consumes excessive memory] → Enforce fixed node, edge, depth, byte, path, and group limits before staging or mutation.
- [Partial success surprises callers] → Return one explicit result per requested paper and group-level dependency/repair evidence.
- [Existing target is modified unintentionally] → Centralize mapping policy and test fresh before/after projections.
- [Archive/resources leak after callbacks] → Scope handles and paths to the call/run and enforce cleanup in `finally` paths.
- [Materializer and direct export drift] → Share resolved-paper implementation and artifact-set SSOT while preserving caller-specific policies.

## Migration Plan

1. Add failing materialization, file, archive, resource, graph, SCC, target-mapping, partial-success, and compensation tests.
2. Complete file/archive/resource owner interfaces over runtime persistence.
3. Deepen paper materialization and freeze run-scoped resources.
4. Implement graph validation, scheduling, effects, verification, and results in the Research Bundle importer.
5. Migrate literature-workbench, MinerU, direct export, and Host Bridge resource adapters.
6. Run focused workflow/product tests, type/lint/build checks, manifest validation, and final project gates.

Rollback disables graph import and restores prior callers while cleaning non-published run staging. Published Products and Zotero state require evidence-based reconciliation rather than blind rollback.
