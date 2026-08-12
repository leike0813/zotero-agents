## Why

The Rust Synthesis sidecar accepts every loopback TCP connection by spawning an unbounded thread, while its HTTP reader has no header bound or read timeout. Partial requests can therefore grow process threads linearly and keep normal shutdown blocked until every client closes its socket.

## What Changes

- Bound the sidecar to sixteen active HTTP connections with immediate, unqueued overload rejection.
- Enforce request-line, header-line, aggregate-header, body, read-idle, read-total, and response-write limits before business dispatch.
- Own active sockets and handler lifetimes in one runtime component so stdin EOF or lifecycle shutdown interrupts incomplete requests and drains handlers within the existing 500 ms shutdown budget.
- Preserve the existing one-request-per-connection protocol, authentication, 96-operation production surface, request-body policies, durable formats, and application behavior.
- Add source-fresh Rust and real-process regression evidence for connection saturation, malformed or incomplete requests, recovery, and shutdown.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-sidecar-runtime-foundation`: Define bounded inbound HTTP admission, framing, I/O deadlines, overload behavior, and request-scoped failure mapping.
- `synthesis-sidecar-shutdown-drain`: Include active HTTP sockets and handler threads in the existing bounded native shutdown contract.

## Impact

The change is limited to the Rust sidecar HTTP reader, server loop, lifecycle dispatch, focused tests, and current Synthesis runtime documentation. It adds no dependency and does not change public client methods, wire capabilities, reverse-Host capabilities, schemas, SQLite state, or release artifacts.
