# Tasks

## 1. Collection-derived default scope

- [x] 1.1 Extend existing Broker scope behavior coverage and demonstrate a failing collection-only search when the current Library differs or is ambiguous.
- [x] 1.2 Resolve all Library search constraints through shared scope resolution, retain explicit scope validation, and pass the focused Broker tests.
- [x] 1.3 Update the Broker main specification and component documentation with default precedence; verify consistency with the delta specification.

## 2. Item-reference intersection

- [x] 2.1 Extend the existing native production-route test for both public search operations with mixed-Library duplicate refs and empty intersections; demonstrate the evidence regression before fixing it.
- [x] 2.2 Filter and deduplicate refs in the shared scope resolver, remove the redundant Library-side intersection, and pass the native cases including completed-empty scopes and frozen continuation.
- [x] 2.3 Synchronize the evidence main specification and document shared intersection behavior; validate both delta specifications with OpenSpec.
- [x] 2.4 Authorize collection-derived scope before scoped reverse-Host reads and pass existing handler tests for unauthorized scope and mixed refs.

## 3. Integration and closeout

- [x] 3.1 Run focused Host/Workflow/Bridge/search tests, native production routes, Rust search tests, type checking, applicable contract checks, and real Zotero core/E2E; record exact commands and outcomes.
- [x] 3.2 Review the final diff, verify artifacts against implementation, and prepare the isolated commit and archive inputs while preserving pre-existing edits.
