## 1. Runtime-log manager TDD

- [x] 1.1 Extend `test/core/45-runtime-log-manager.test.ts` with failing coverage for async hydration and legacy migration, single serialization, lightweight listener events, summary facets, debounce/max-delay scheduling, single-flight revisions, true flush, and retry after failure.
- [x] 1.2 Refactor `src/modules/runtimeLogManager.ts` to implement explicit initialization, serialized-entry retention, lightweight change/summary APIs, revisioned single-flight persistence, bounded scheduling, true flush, and awaitable clear while preserving filtering, redaction, retention, and bundle behavior.

## 2. Atomic persistence TDD

- [x] 2.1 Extend `test/core/108-runtime-persistence-governance.test.ts` with failing coverage for ordered JSON chunk assembly, 256 KiB physical append bounds, surrogate safety, failure preservation, temporary-file cleanup, and pending-save cleanup ordering.
- [x] 2.2 Extend `src/modules/runtimePersistence.ts` with a reusable atomic chunked text replacement primitive, runtime-log document streaming, asynchronous clearer registration, and logs-category cleanup ordering.

## 3. Lifecycle and Task Manager integration

- [x] 3.1 Extend existing Task Manager and lifecycle tests to require initialization before startup producers, summary plus a 300-entry visible list without snapshot polling, and awaitable user clear.
- [x] 3.2 Update `src/hooks.ts` and `src/modules/taskManagerDialog.ts` to use the new initialization, summary/list refresh, true shutdown flush, and awaitable clear contracts.

## 4. Zotero host acceptance

- [x] 4.1 Add `test/core/187-runtime-log-persistence.zotero.test.ts` for real `IOUtils` hydration/save, single-flight true flush, and parseable atomic chunk replacement without machine-timing assertions.
- [x] 4.2 Register the host gate in `test/zotero/core/lite/suite.test.ts`, `test/zotero/domainFilter.ts`, and `test/workflow-tag-vocabulary/hostApiTestUtils.ts` without expanding unrelated domains.

## 5. Documentation and validation

- [x] 5.1 Update `doc/testing-framework.md` and `artifact/acp-silent-execution-zotero-host-ui-stall-risk-audit-20260712.md` with the Zotero 9 R8 evidence, the Zotero 7 follow-up boundary, and the `runtime_log_persist*` profiler-category distinction.
- [x] 5.2 Run focused Node tests, TypeScript, formatter and ESLint checks, Zotero core-lite, and strict OpenSpec validation; resolve in-scope failures and record any environment limitations.
