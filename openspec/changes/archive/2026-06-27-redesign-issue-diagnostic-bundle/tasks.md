## 1. OpenSpec Contracts

- [x] 1.1 Add issue diagnostic bundle spec.
- [x] 1.2 Update runtime diagnostic bundle spec to distinguish raw/developer export from issue export.
- [x] 1.3 Update runtime log pipeline spec for ACP and SkillRunner cache refresh coverage.
- [x] 1.4 Update log viewer spec so debug is hidden by default and Copy Diagnostic Bundle uses the issue bundle.

## 2. Runtime Diagnostic Model

- [x] 2.1 Add `RuntimeIssueDiagnosticBundleV1` and `buildRuntimeIssueDiagnosticBundle`.
- [x] 2.2 Ensure issue bundles default to high-signal timeline events and no raw `entries`.
- [x] 2.3 Add evidence gap detection for missing context/backend/cache logs.
- [x] 2.4 Keep existing raw diagnostic export available for developer use.

## 3. Logging Coverage

- [x] 3.1 Add structured ACP backend probe/cache refresh logs.
- [x] 3.2 Add structured SkillRunner model cache refresh logs.
- [x] 3.3 Ensure cache refresh details are sanitized and summarized.

## 4. UI Defaults and Export Action

- [x] 4.1 Change default log viewer filter to hide debug.
- [x] 4.2 Route Copy Diagnostic Bundle to the issue bundle builder.
- [x] 4.3 Keep visible/raw log copy actions unchanged.

## 5. Verification

- [x] 5.1 Update runtime log manager and log viewer tests.
- [x] 5.2 Add ACP probe and SkillRunner model cache logging tests.
- [x] 5.3 Run OpenSpec validation, TypeScript check, and related tests.
