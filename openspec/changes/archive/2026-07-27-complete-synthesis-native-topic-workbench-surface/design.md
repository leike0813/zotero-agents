## Context

The parent R9a change owns the final production cutover contract but its single native-dispatch task combines ninety-five operations. This change owns the eighteen Topic and Workbench operations listed for it in the parent `operation-ownership.json`. Some already have repository-backed handlers, but all require public-contract evidence before they count as ready.

## Goals / Non-Goals

**Goals:**

- Preserve the existing `SynthesisClient` request/result DTOs and stable errors for the owned operations.
- Compose Topic repository, canonical artifact, workflow projection, background-job, and declared Host-effect ports behind one compatibility boundary.
- Prove each operation independently before adding it to the native ready roster.

**Non-Goals:**

- Changing public client methods or Topic canonical formats.
- Implementing Citation, Reference, Tag, Concept, WebDAV, or destructive maintenance operations.
- Enabling the global mutation gate or publishing the production default client.

## Decisions

### Keep public compatibility above typed applications

`runtime_production_compat` owns legacy-facing request/result reconstruction. Typed Topic and Workbench applications retain their internal CAS and basis-bearing contracts. The compatibility layer may orchestrate typed calls but may not open production roots, create sockets, or bypass reverse-Host ports.

### Treat projections and jobs as separate semantics

Topic list/detail/context/report/resolver and Workbench chrome/surface projections use explicit DTO builders. Background mutations use durable job state with stable ids, progress, retry, and terminal results; a public no-argument command must not be deserialized as an internal worker payload.

### Admit operations from evidence, not registry presence

Each operation receives a table-driven differential fixture covering valid results, malformed input, stable failures, bounds, and deadline behavior. Mutations additionally cover basis conflict, durable reopen, and Host failure. A handler name or compile-time registry match alone is insufficient for ready-roster admission.

## Risks / Trade-offs

- [Legacy projections combine several stores] → Capture a coherent repository/canonical basis and return `superseded` rather than mixed-epoch output.
- [Job orchestration can duplicate side effects] → Persist idempotency and job receipts before applying Host effects.
- [Compatibility DTOs can drift from typed models] → Keep public fixtures language-neutral and compare normalized Node/Rust results.
