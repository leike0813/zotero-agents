## 1. Application seam

- [x] 1.1 Add a failing tracer test for the grouped `ReferenceApplication` read interface, then implement the typed root interface and semantic projection DTOs.
- [x] 1.2 Add failing Host paging/checkpoint behavior tests, then move `ReferenceHostPort`, bounded collection, and per-call checkpoint orchestration behind the application seam.

## 2. Durable Reference use cases

- [x] 2.1 Add failing canonical mutation behavior tests through `ReferenceApplication`, then add the dedicated canonical persistence interface and atomic repository adapter operations.
- [x] 2.2 Migrate canonical review, merge, batch, metadata, archive, receipt, basis, and cache-stale behavior without exposing repository ownership.
- [x] 2.3 Compose existing Refresh and Matching/Review use cases behind the grouped interface while preserving their independent tests and durable semantics.

## 3. Runtime cutover

- [x] 3.1 Add or update failing runtime translation tests, then switch Reference/Canonical routes, Workbench projection callers, production composition, and reverse-Host adapters to the new seam.
- [x] 3.2 Update citation/reference parity execution and replace internal repository assertions with interface outcomes and close/reopen evidence.
- [x] 3.3 Delete the former runtime application and every Reference production `RepositoryPort::owner()` escape without leaving a compatibility wrapper.

## 4. Documentation and verification

- [x] 4.1 Update Synthesis ownership, runtime, and persistence documentation to match the implemented seam.
- [x] 4.2 Run formatting, application/repository/runtime tests, parity evidence, strict OpenSpec validation, and targeted searches for stale ownership.
