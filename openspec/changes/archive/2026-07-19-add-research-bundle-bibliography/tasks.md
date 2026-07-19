## 1. Workflow Host Export Capability

- [x] 1.1 Add failing Host API tests for v10 and ordered export-translator fallback.
- [x] 1.2 Implement the generic item text exporter with structured unavailable, failed, empty-output, and success attempts.
- [x] 1.3 Expose `items.exportText()` through Workflow Host API v10 and update package runtime version negotiation.

## 2. Research Bundle Bibliography

- [x] 2.1 Extend Research Bundle tests for complete materialized-item export, root asset integrity, native fallback, atomic double failure, and no-materialized-item behavior.
- [x] 2.2 Export the materialized paper set to root `references.bib` with Better BibTeX followed by Zotero BibTeX.
- [x] 2.3 Add manifest bibliography provenance, structured fallback diagnostics, and localized README navigation.

## 3. Specifications And Documentation

- [x] 3.1 Update Research Bundle workflow and readable-product requirements for bibliography generation and layout.
- [x] 3.2 Update workflow and site documentation with actual-format, fallback, and atomic-failure semantics.

## 4. Verification

- [x] 4.1 Pass targeted Host API and Research Bundle tests.
- [x] 4.2 Pass Workflow loader and debug-probe version-contract tests.
- [x] 4.3 Pass TypeScript type checking, repository lint, formatting, built-in workflow manifest validation, and `git diff --check`.
