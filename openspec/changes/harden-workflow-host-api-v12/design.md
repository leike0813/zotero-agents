## Context

See `proposal.md` for motivation. Changes `01-establish-workflow-host-v12-contract-foundation` through `07-add-workflow-host-synthesis-facade` prepare owner capabilities behind the active v11 projection. Publishing individual v12 members earlier would create multiple incompatible shapes and force temporary aliases into production.

The fixed baseline is `4dbddc24e884921262c559428bf851db5eadf2d7`. This change begins only after all seven public-contract prerequisites are complete and verified. `02p-consolidate-platform-subprocess-one-shot-seam` is outside the public dependency chain but remains part of the overall runtime-adaptation completion report.

The authoritative architecture source is [`artifact/workflow-host-v12-architecture-decisions.md`](../../../artifact/workflow-host-v12-architecture-decisions.md), especially §§3.3–3.9, 4.1–4.4, 7, 14.1–14.7, 15.1, 16–18, and 19.6–19.7. Its exact 23/21/85 manifest, hard-cut deletion ledger, variant parity, deferred inventory, documentation closure, and final-review criteria take precedence over abbreviated wording in this design.

## Goals / Non-Goals

**Goals:**

- Activate one exact v12 surface and version in a single change.
- Reduce `hostApi.ts` to closed composition and deny adapters.
- Migrate every official consumer and remove every approved legacy access path.
- Establish one code-native manifest, recursive conformance, exact package guard, and canonical public spec.

**Non-Goals:**

- Reimplementing owner behavior completed by prerequisite changes.
- Adding compatibility aliases, optional projections, capability catalogs, or phased v12 shapes.
- Automatically exposing Workflow members through Host Bridge/MCP.
- Publishing, releasing, or editing generated help content directly.

## Decisions

### Activation is atomic across type, value, package, and documentation identity

The change updates `WorkflowHostApi`, the code-native manifest, composition literals, `WORKFLOW_HOST_API_VERSION`, variant adapters, diagnostics, package guard, official consumers, canonical spec, and current documentation together. A feature flag or dual v11/v12 facade was rejected because both would create a second surface identity.

### The readonly nested manifest is the only runtime identity

`workflowHostContract.ts` owns one readonly literal containing metadata and nested callable identities. Type-level exactness checks both directions between the literal and `WorkflowHostApiV12`. Composition and both variants satisfy the same structure. Diagnostics inspect it; they do not define it.

### Host composition contains no domain implementation

`hostApi.ts` imports owner factories and projects each member by name. UI-dependent members receive either interactive adapters or non-interactive deny adapters. Runtime dependency failure remains inside each present member. DTO validation, revisions, mutation registry, filesystem selection, Synthesis client logic, and resource lifecycle stay outside composition.

### Consumer migration precedes deletion within the same change

Tests first identify every official use of raw and legacy paths. Each consumer migrates to the staged owner members. Only after consumer tests pass are v11 types, composition members, injected globals, handler spreads, flat aliases, and compatibility guards deleted. No compatibility layer is introduced to make an intermediate commit pass.

### Governance uses semantic identities rather than source snapshots

Conformance asserts unordered exact member sets, callable positions, version, interaction mode, portable type resolution, and forbidden consumer imports. It does not snapshot full source, prose, field order, or internal call order.

### Canonical spec and owner specs have different responsibilities

`workflow-host-api-v12` owns the complete public member map, call shapes, variants, hard cut, and composition rules. Prerequisite delta specs own library, mutation, runtime, research, snapshot, and Synthesis behavior. Documentation describes the same public contract but does not drive runtime discovery.

## Risks / Trade-offs

- [One cut touches many consumers] → Complete and verify each owner first, then migrate consumer families behind an exact failing conformance gate.
- [Hidden legacy access remains] → Run AST/import/package scans for every approved escape hatch and require zero findings.
- [Manifest and TypeScript drift] → Bidirectional compile-time checks plus recursive runtime conformance and 23/21/85 metrics.
- [Non-interactive variant loses members] → Compose deny adapters before removing optional shapes and test both variants side by side.
- [Documentation becomes a second manifest] → Keep only human-readable contract text and gate its declared version; runtime identity remains code-native.
- [Parallel changes collide in shared files] → Integrate snapshot-specific contract additions before grouped Synthesis additions, then apply activation only on the verified combined state.

## Migration Plan

1. Verify prerequisite changes and record their focused evidence against baseline `4dbddc24e884921262c559428bf851db5eadf2d7`.
2. Add failing exact v12 manifest, variant, package-guard, and forbidden-consumer tests.
3. Install the v12 manifest, types, version, composition, and deny adapters without compatibility projection.
4. Migrate literature-workbench, Synthesis-layer, workflow-debug, MinerU, runtime, and test helpers by consumer family.
5. Delete the approved v11/raw member and symbol inventory after all official consumers pass.
6. Synchronize package manifests, canonical spec, owner deltas, and current source documentation.
7. Run targeted tests, the complete Node/Zotero/workflow/Synthesis matrix, manifest checks, lint, build, and PR gate.

Rollback is an atomic source-level reversal of activation. It must restore one coherent v11 identity rather than retain mixed v11/v12 files; no persisted-data migration is involved.
