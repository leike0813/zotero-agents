## 1. Regression Tests

- [x] 1.1 Add import-notes coverage for complete standard imports triggering sidecar apply.
- [x] 1.2 Add import-notes coverage for partial standard imports triggering sidecar apply without fabricated siblings.
- [x] 1.3 Add import-notes coverage that custom-only imports do not trigger sidecar apply.

## 2. Implementation

- [x] 2.1 Extract the literature digest sidecar apply wrapper into a shared package helper.
- [x] 2.2 Update literature-analysis to use the shared sidecar helper without behavior changes.
- [x] 2.3 Update import-notes to call the shared sidecar helper after standard imports and return sidecar_apply.
- [x] 2.4 Register the shared helper in the builtin workflow manifest.

## 3. Verification

- [x] 3.1 Run the targeted import/export workflow tests.
- [x] 3.2 Run builtin workflow manifest validation.
- [x] 3.3 Run OpenSpec validation for refresh-sidecar-after-import-notes.
