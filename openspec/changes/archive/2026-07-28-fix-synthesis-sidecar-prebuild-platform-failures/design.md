## Context

The obsolete push workflow exposed environment-specific failures while the
manual prebuild workflow retained its build and smoke commands. The sidecar is
a release input only after all seven target archives form one content-addressed
set, so runner-specific compiler packages and implicit HTTP client behavior
are unsuitable gates.

## Goals / Non-Goals

**Goals:**

- Build every Linux target through the pinned Zig/cargo-zigbuild path used by
  the Host Bridge CLI prebuild workflow.
- Keep Rust warning-as-error checks portable across Windows and Unix.
- Exercise health, authentication, and malformed-payload behavior through one
  explicitly framed loopback HTTP client.

**Non-Goals:**

- Reintroducing a push-triggered candidate workflow.
- Changing runtime protocol schemas, bundle schemas, signing policy, or the
  published prebuild-set layout.

## Decisions

- The manual sidecar workflow will install the recipe-pinned Zig and
  cargo-zigbuild versions only for Linux targets, then use cargo-zigbuild for
  each Linux build. This removes the unavailable Ubuntu cross-GCC package
  dependency and matches the established Host Bridge construction model.
- The sidecar build recipe will be a checked-in JSON document read by the
  workflow planning job and governance code. It is the source for toolchain
  versions and the seven target runner/build mappings; target triples remain
  validated against the shared runtime contract.
- Unix-only `File` is conditionally imported rather than weakening clippy. The
  import then matches the only code path that uses it.
- The durable smoke script will use a small Node `http` helper with declared
  byte length and connection close semantics. This tests the sidecar boundary
  with a stable HTTP/1.1 request shape and reports response bodies on failure.

## Risks / Trade-offs

- [Zig differs from the system linker] → pin versions in the recipe and retain
  package, provenance, manifest, and aggregate integrity gates.
- [A hand-written smoke client could drift from normal callers] → cover health,
  unauthorized, and malformed request outcomes in the same helper and retain
  the existing complete durable workflow.
- [Recipe and shared target contract could diverge] → validate target names and
  triples in governance and focused tests before dispatch.

## Migration Plan

1. Add the recipe and make the only manual workflow consume it.
2. Correct the Windows-only clippy failure and make smoke HTTP framing stable.
3. Run local format, clippy, workspace tests, contracts, and native smoke.
4. After separate remote-write authorization, dispatch one explicit prebuild.

Rollback is a source revert of these changes; it does not touch existing
content-addressed prebuild sets or receipts.

## Open Questions

None.
