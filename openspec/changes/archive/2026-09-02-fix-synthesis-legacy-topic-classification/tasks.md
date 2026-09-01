## 1. Legacy Topic Classification

- [x] 1.1 Add a table-driven repository test for canonical-bearing, graph-only, and invalid legacy Topic states, then implement the closed inventory and verify the targeted repository tests pass
- [x] 1.2 Add canonical preflight cases for known graph-only metadata and unexplained identities, then filter projection through the inventory and verify canonical files remain byte-identical

## 2. Native Startup Regression

- [x] 2.1 Add a real `serve` process case with materialized, planned, stale, and deleted legacy Topics, compose the inventory through startup, and verify discovery, atomic migration, durable row preservation, shutdown, and pre-write failure rollback

## 3. Actionable Recovery UI

- [x] 3.1 Add a Workbench state test for `manual-recovery-required`, implement the localized data-preservation guidance in all locales, and verify retry, diagnostics, and stable reason code behavior

## 4. Documentation and Gates

- [x] 4.1 Update runtime supervision documentation and run targeted Rust/Node tests, localization, type, format, clippy, strict OpenSpec, and diff checks
