## 1. Runtime filesystem and Workflow Input Materialization

- [x] 1.1 Add failing tests for strict versus tolerant runtime file behavior,
  Host file path normalization, unavailable adapters, and unchanged managed
  materialization semantics.
- [x] 1.2 Implement shared strict runtime filesystem primitives and extract the
  Workflow Input Materialization module; make the focused tests pass.

## 2. File picker

- [x] 2.1 Replace helper-level picker assertions with failing behavior tests at
  the shared picker/Workflow Host interface, including native multi-file
  selection and toolkit fallback.
- [x] 2.2 Move native multi-file adaptation into `filePicker` and reduce the
  Workflow Host composition to explicit delegation.

## 3. Workflow Note Image Preparation

- [x] 3.1 Add failing tests for supported sources, bounded output, hard-cap
  failure, and runtime-unavailable behavior without asserting Canvas call order.
- [x] 3.2 Extract the complete preparation pipeline behind its one-operation
  interface while preserving current defaults, quality policy, diagnostics, and
  late-bound runtime selection.

## 4. Workflow Stored Attachment Import

- [x] 4.1 Add failing tests for pre-mutation path/source validation, successful
  nested companion import, and post-mutation rollback.
- [x] 4.2 Implement managed companion staging, stored attachment import, storage
  copy, cleanup, and best-effort rollback behind the workflow interface.

## 5. Composition and documentation

- [x] 5.1 Remove migrated implementation from `hostApi.ts`, preserve the closed
  Workflow Host API v11 member set, and keep archive behavior unchanged.
- [x] 5.2 Update project constraints, domain vocabulary, runtime persistence
  SSOT, and broker/projection SSOT with current-state ownership.

## 6. Validation

- [x] 6.1 Run focused tests after each vertical slice, then Node core, Zotero
  core, TypeScript, targeted formatting/lint, build, OpenSpec strict validation,
  and diff whitespace checks; resolve every task-scoped failure.
