## Why

The manually dispatched Synthesis sidecar prebuild has exposed three sequential
defects after all seven platform jobs had started: target-name confusion, an
invalid timestamp, and a missing compile-time worker fingerprint.  It also
allows the workflow revision and checked-out source commit to differ, which
cannot produce release-eligible provenance.

## What Changes

- Lock a manual prebuild's requested source SHA to the workflow dispatch
  revision, and inject the computed Rust source fingerprint into every Rust
  build.
- Make bundle validation check source provenance as well as the existing target,
  build fingerprint, manifest, and file digest checks.
- Validate the exact downloaded archive set and its extracted bundle contents
  before an aggregate can be published.
- Add regression coverage for source drift and malformed prebuild input.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-sidecar-prebuild-release`: Manual sidecar prebuild identity and
  aggregate admission gain compile-time fingerprint and archive verification
  requirements.

## Impact

The manual prebuild workflow, runtime packaging and staging scripts, their
contract tests, and the sidecar prebuild/release OpenSpec specification are
updated.  No plugin release, GitHub Release, or existing prebuild object is
mutated.
