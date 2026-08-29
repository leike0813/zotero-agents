## 1. Contract and Host Adapter TDD

- [x] 1.1 Add Core 182 red tests for canonical request/result rebuilding, unknown-field removal, JSON safety, path/name/capability validation, shared entry/byte/diagnostic limits, invalid-before-I/O behavior, and stable adapter outcomes.
- [x] 1.2 Implement and export the strict `SynthesisHostExportDeliveryPort` contract and its shared bounds.
- [x] 1.3 Implement the Host adapter for temporary ZIP creation, hashing, file registration, opaque receipt projection, and failure cleanup.

## 2. Service and Composition Migration

- [x] 2.1 Extend Core 123/129 first for remote filtered-artifact and Topic Context parity, missing/throwing/unavailable/malformed port behavior, and absence of path/error leakage.
- [x] 2.2 Add the optional Host export-delivery port to `SynthesisService`, split pure filtered-content projection from local writes, and route both remote exporters exclusively through canonical Host DTOs.
- [x] 2.3 Inject the Host adapter in default legacy composition and explicitly omit it from readonly composition.

## 3. Boundary and Regression Guardrails

- [x] 3.1 Update Core 168/175/176 to require contract export/default injection/readonly omission, forbid direct ZIP/Host registry/remote-temp helpers in the service, and retain `125 methods / 1 direct consumer`.
- [x] 3.2 Run Core 123, 129, 131, 138, 155, 157, 168, 172, 175, 176, 178-182, and Synthesis invariant regressions; fix only change-related failures.

## 4. Documentation and Validation

- [x] 4.1 Update current-state Synthesis README, runtime/rebuild, persistence, and Host boundary documentation for the remote export-delivery port and readonly omission.
- [x] 4.2 Run contract/root TypeScript, service-boundary validation, targeted Prettier/ESLint checks, `git diff --check`, and the production build.
- [x] 4.3 Run strict OpenSpec validation and confirm all implementation tasks complete without archiving, publishing, or committing the change.
