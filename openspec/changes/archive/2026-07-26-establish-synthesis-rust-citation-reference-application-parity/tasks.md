## 1. Contract and regression coverage

- [x] 1.1 Extend Core 207–209 and cross-language contract coverage with the typed Rust boundary and corpus evidence assertions
- [x] 1.2 Add Rust tests for Citation Graph, Reference Refresh, and Matching/Review success, stable failures, admission, drain, and reopen behavior

## 2. Typed persistence adapters

- [x] 2.1 Add Citation Graph records, bounded CRUD, active-state CAS replacement, and metrics/layout promotion to the Rust repository
- [x] 2.2 Add Reference Refresh typed records and full/scoped expected-basis transactional projection replacement
- [x] 2.3 Add Matching/Review preparation, proposal, fact-transition, page, and partial-success review persistence

## 3. Typed Rust applications

- [x] 3.1 Add typed DTO and port boundaries for Citation/Reference kernel and repository dependencies
- [x] 3.2 Implement Citation Graph inspect/read/rebuild/metrics/layout with single-flight admission, cancellation, and drain
- [x] 3.3 Implement Reference Refresh prepare/apply/discard with exact single-use materialization and protected-fact preservation
- [x] 3.4 Implement Matching/Review double-pass preparation, CAS apply, proposal lifecycle, partial batch review, and drain

## 4. Differential evidence and composition

- [x] 4.1 Add the strict `synthesis-citation-reference-application-parity-v1` corpus and development-only Rust driver
- [x] 4.2 Add the Node oracle checker comparing DTOs, all tables, untouched canonical owners, and reopen state
- [x] 4.3 Preserve private-only composition: no public mutation capability, client route, automatic downstream work, or Node fallback

## 5. Governance and verification

- [x] 5.1 Gate all five candidate targets with the new checker before smoke and expose a package script
- [x] 5.2 Update migration evidence to record this cluster and the two remaining R7 blockers
- [x] 5.3 Run Rust formatting, clippy, workspace tests, parity gates, TypeScript quality/build gates, candidate smoke and size gates, diff check, and strict OpenSpec validation
