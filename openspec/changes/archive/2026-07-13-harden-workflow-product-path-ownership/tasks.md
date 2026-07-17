## 1. Regression Boundaries

- [x] 1.1 Extend workflow product storage tests with table-driven invalid explicit targets and final-target duplicate coverage.
- [x] 1.2 Extend managed asset resolution tests for tampered `cacheDir`, traversal/foreign `localPath`, and missing derived files.

## 2. Canonical Product Paths

- [x] 2.1 Replace product-local path validators with one target resolver backed by the shared managed-relative-path policy.
- [x] 2.2 Make registration, duplicate detection, materialization, and missing records consume the resolved target without recalculation.
- [x] 2.3 Route the existing single-asset public methods through one private cache implementation.

## 3. Derived Ownership

- [x] 3.1 Derive product cache directories from runtime storage and product identity for both writes and reads.
- [x] 3.2 Resolve managed assets from validated relative paths and reject inconsistent persisted ownership metadata.

## 4. Validation

- [x] 4.1 Run focused workflow product and Host Bridge regression tests.
- [x] 4.2 Run OpenSpec validation, TypeScript typecheck, and focused formatting/lint checks.
