## 1. Contract and Host Adapter TDD

- [x] 1.1 Add Core 180 red tests for canonical request/result rebuilding, unknown-field removal, invalid-before-Zotero behavior, JSON safety, the 2 MiB/20-diagnostic limits, and stable absent/unavailable adapter outcomes.
- [x] 1.2 Implement and export the shared representative-image read contract with strict JSON-safe DTO validation and shared bounds.
- [x] 1.3 Split representative-image descriptor parsing/UI projection into pure logic and implement the Zotero Host read adapter.

## 2. Service and Composition Migration

- [x] 2.1 Extend Core 131 first for available/legacy projections, skip conditions, absent results, missing ports, and best-effort transport/malformed/unavailable outcomes.
- [x] 2.2 Add the optional Host representative-image read port to `SynthesisService` and route digest enrichment exclusively through canonical Host DTOs.
- [x] 2.3 Inject the Zotero adapter in default legacy composition and explicitly omit it from readonly composition.

## 3. Boundary and Regression Guardrails

- [x] 3.1 Update Core 168/176 composition and source-boundary checks so service/pure helpers cannot access Zotero, paths, or file I/O and inventory remains `128 methods / 1 direct consumer`.
- [x] 3.2 Run Core 125, 131, 157, 168, 175, 176, 178, 180, the readonly UI harness, and Synthesis invariant regressions; fix only change-related failures.

## 4. Documentation and Validation

- [x] 4.1 Update Synthesis README, runtime/rebuild guidance, and boundary documentation to describe the representative-image Host port and readonly omission.
- [x] 4.2 Run contract/root TypeScript checks, service-boundary validation, targeted Prettier/ESLint, `git diff --check`, and the production build.
- [x] 4.3 Run strict OpenSpec validation and confirm all implementation tasks are complete without archiving, publishing, or committing the change.
