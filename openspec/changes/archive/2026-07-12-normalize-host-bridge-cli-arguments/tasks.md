## 1. CLI argument contracts

- [x] 1.1 Introduce canonical read-query arguments with hidden input compatibility aliases and preserve write payload input arguments.
- [x] 1.2 Convert item search to JSON query input, separate workflow/product canonical flags, and preserve required compatibility forms and conflicts.

## 2. Verification

- [x] 2.1 Add parser and payload-mapping regression coverage for canonical flags, hidden aliases, conflicts, and item-search rejection.

## 3. Generated surfaces and specifications

- [x] 3.1 Update the Host Bridge semantic sources and surface catalog examples for canonical argument intent and raw-call boundaries.
- [x] 3.2 Render generated Host Bridge surfaces and update the main CLI interface specification.

## 4. Validation

- [x] 4.1 Run Rust CLI tests, surface sync/profile checks, and OpenSpec strict validation.
