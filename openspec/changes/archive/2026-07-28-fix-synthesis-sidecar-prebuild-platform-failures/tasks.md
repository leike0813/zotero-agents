## 1. Reproducible prebuild construction

- [x] 1.1 Add and validate the checked-in seven-target sidecar build recipe.
- [x] 1.2 Make the sole manual prebuild workflow consume the recipe and use
      pinned Zig/cargo-zigbuild for Linux targets.
- [x] 1.3 Update focused workflow and governance tests for the recipe and the
      absence of runner cross-GCC installation.

## 2. Cross-platform runtime gates

- [x] 2.1 Correct the Unix-only canonical-store import so Windows clippy is
      warning-free.
- [x] 2.2 Replace implicit durable smoke HTTP requests with explicit framed
      requests and assert the health/authentication/invalid-request boundary.

## 3. Verification

- [x] 3.1 Run focused tests, OpenSpec validation, Rust format/clippy/tests,
      cross-language contracts, and a local native durable smoke.
