## Why

The last obsolete push-triggered sidecar candidate run failed on four of the
seven declared targets: two Linux cross-builds depended on unavailable runner
packages, Windows rejected a Unix-only import during clippy, and Intel macOS
rejected a smoke request before authentication. The sole retained manual
prebuild workflow must produce the same seven-target evidence reliably before
it can be used as a release input.

## What Changes

- Replace runner apt cross-toolchain installation with the pinned Zig and
  `cargo-zigbuild` build path already used for Host Bridge Linux prebuilds.
- Make the canonical-store file handle import conditional on Unix so the
  Windows warning-as-error gate is portable.
- Make durable sidecar smoke requests use explicit HTTP framing and verify
  health, authorization, and malformed-payload status behavior at the wire
  boundary.
- Retain one explicit, manually dispatched sidecar prebuild workflow; no push
  workflow is reintroduced.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `synthesis-sidecar-prebuild-release`: Seven-target prebuild construction
  SHALL use a pinned, runner-independent Linux cross-build recipe.
- `synthesis-sidecar-runtime-foundation`: The native loopback HTTP boundary
  SHALL preserve health, authentication, and invalid-request status semantics
  for explicitly framed requests.

## Impact

Affected areas are the manual GitHub Actions prebuild workflow, Rust
canonical-store imports, the durable candidate smoke script, their focused
contract tests, and release-governance fingerprint inputs. No plugin API,
release set schema, or GitHub Release object is added.
