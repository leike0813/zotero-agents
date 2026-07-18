## 1. Gate Contracts TDD

- [x] 1.1 Add Dashboard normalization and Host capability tests for debug-off, source-off, and both-enabled states.
- [x] 1.2 Add the default-off source literal, compile-time define, test override, and dual-gate availability behavior.
- [x] 1.3 Update Dashboard and Host Bridge entry points to use the dual gate and lazy audit snapshot loading.

## 2. Governor Audit Isolation TDD

- [x] 2.1 Refine existing governor tests to lock enabled event semantics, per-instance isolation, bounded retention, pure snapshot reads, and scheduling invariance.
- [x] 2.2 Extract the audit Store and snapshot facade, remove audit-owned state from governor instances, and gate every event point before input construction.
- [x] 2.3 Update audit consumers and test/reset seams to the new one-way dependency structure without compatibility wrappers.

## 3. Build Elision TDD

- [x] 3.1 Extend the runtime-diagnostics build tests for debug-off, source-off, and both-enabled SkillRunner audit bundles.
- [x] 3.2 Generalize the ACP side-effects/elision helpers, update repository references, and prove zero module bytes, markers, and governor audit hot-path work in disabled builds.

## 4. Documentation and Validation

- [x] 4.1 Update debug-mode, Dashboard, and SkillRunner workspace documentation to describe the source gate and correct the former always-on collection drift.
- [x] 4.2 Run focused core/UI/node tests, TypeScript, ESLint, Prettier, production build, runtime-diagnostics release-elision, `git diff --check`, and strict OpenSpec validation.
