## Context

The manual seven-platform workflow invokes a Linux ARM64 runner for
`linux-arm64`. Sending that native target through Zig makes the linker reject
the ARM64 erratum option it receives. Separately, the durable smoke's
platform-dependent Node HTTP path obscures the exact wire frame, while a
Windows directory handle cannot be flushed through the current read-only
open.

## Decisions

- The checked-in recipe remains the single target mapping. `linux-arm64` has
  `useZig: false`, stays on `ubuntu-24.04-arm`, installs its declared Rust
  target, builds it directly with Cargo, and retains `nativeSmoke: true`.
  The other three Linux targets retain Zig and cargo-zigbuild.
- Durable smoke opens a TCP loopback connection and writes a complete HTTP/1.1
  request with method, request target, Host, Accept, Connection, Content-Length,
  and body. It parses the status line, headers, and content-length-delimited
  body, and includes the body in failed health diagnostics.
- Unix continues to fsync directories. Windows keeps every file `sync_all` and
  makes directory synchronization a documented no-op: Windows requires a
  writable handle for `FlushFileBuffers`, whereas the transaction journal and
  recovery process already bound rename recovery.

## Risks and Mitigations

- A native ARM64 build could accidentally lose smoke coverage. The recipe test
  locks `nativeSmoke: true`, and the workflow continues to run the durable
  smoke for that target.
- A raw client can misparse incomplete responses. It rejects malformed headers,
  status lines, and content lengths, and the smoke still exercises health,
  authentication, malformed input, concurrent work, and restart.
- A Windows no-op could mask a transaction regression. Windows-specific tests
  run promotion and restart recovery through the same canonical-store path.

## Non-Goals

- Add Win32 FFI or a dependency to force directory metadata flushes.
- Bypass native smoke, Windows tests, source provenance, package validation,
  content-addressed publication, or any seven-platform gate.
