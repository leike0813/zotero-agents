## 1. Prebuild identity and worker provenance

- [x] 1.1 Lock the workflow's requested source SHA to its dispatch revision and
      propagate the verified Rust source fingerprint into every compiler path.
- [x] 1.2 Add package-time bundle self-validation including source provenance.

## 2. Aggregate admission

- [x] 2.1 Validate the exact downloaded archive set, safe archive paths, and
      extracted seven-target directory set before staging an aggregate.
- [x] 2.2 Bind staging and synchronization bundle verification to the expected
      Rust source fingerprint.

## 3. Regression coverage and verification

- [x] 3.1 Extend sidecar packaging and workflow governance tests for source
      identity, worker fingerprint injection, and malformed prebuild input.
- [x] 3.2 Run focused tests, native Rust checks, and OpenSpec validation.
