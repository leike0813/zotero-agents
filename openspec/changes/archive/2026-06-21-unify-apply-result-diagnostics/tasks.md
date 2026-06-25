## 1. Regression Tests

- [x] 1.1 Add literature-analysis coverage for non-null skill error with valid artifacts.
- [x] 1.2 Add literature-explainer coverage for non-null skill error with valid note artifact.
- [x] 1.3 Add literature-deep-reading coverage for failed-like output with valid HTML artifact.
- [x] 1.4 Add literature-translator coverage for non-success status with valid artifacts and missing-artifact diagnostics.
- [x] 1.5 Add tag-regulator coverage for non-null skill error with valid mutations and malformed skip diagnostics.

## 2. Implementation

- [x] 2.1 Add package-local helper for normalizing warnings and skill diagnostics.
- [x] 2.2 Update literature-analysis, literature-explainer, literature-deep-reading, and literature-translator apply hooks to return diagnostics and avoid diagnostic-only blocking.
- [x] 2.3 Update tag-regulator apply hook to stop treating non-null skill error as an automatic mutation blocker.

## 3. Verification

- [x] 3.1 Run the targeted workflow tests for the five affected workflows.
- [x] 3.2 Run builtin workflow manifest validation.
- [x] 3.3 Run OpenSpec validation for unify-apply-result-diagnostics.
