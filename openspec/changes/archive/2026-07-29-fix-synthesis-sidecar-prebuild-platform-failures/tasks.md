## 1. Target construction

- [x] 1.1 Mark Linux ARM64 as native in the checked-in build recipe and retain its native smoke.
- [x] 1.2 Validate that only Linux cross-build targets require Zig, and build native targets with their explicit Rust target triple.
- [x] 1.3 Update focused workflow tests to protect the ARM64-native and three-cross-target split.

## 2. Durable and Windows platform behavior

- [x] 2.1 Replace the durable smoke HTTP client with a controlled raw TCP HTTP/1.1 request and response parser, preserving all smoke assertions and response-body diagnostics.
- [x] 2.2 Keep Unix directory fsync and make Windows directory synchronization an explicit no-op while retaining file sync, atomic rename, journal, and recovery.
- [x] 2.3 Add Windows-only canonical-store coverage that promotion and restart recovery remain available.

## 3. Verification

- [x] 3.1 Run focused TypeScript tests and the local native durable smoke.
- [x] 3.2 Run Rust format, clippy, and workspace tests, including Windows-target compilation checks where available.
- [x] 3.3 Validate the OpenSpec change and report that a new source SHA and request ID are required before a future manual prebuild dispatch.
