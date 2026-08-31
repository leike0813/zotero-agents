## Why

The Rust Synthesis sidecar is now launchable, but its production failure
summaries lose causal detail and its debug surface still mirrors runtime logs
instead of exposing a usable correlated trace. The latest Reference Sidecar
refresh also exposed a contract mismatch: reference materialization admits
8 MiB while the reverse-Host response path rejects bodies above 1 MiB. Real
Gecko validation additionally showed that partial output-stream writes were
counted as complete, leaving `Content-Length` larger than the transferred body.

## What Changes

- Separate bounded production failure summaries from the richer, session-only
  debug timeline used while the Rust sidecar is being stabilized.
- Gate the Synthesis Sidecar page and debug instrumentation behind both an
  independent source switch and `__debug_mode__`, and remove their executable
  cost from production output.
- Move the Synthesis Sidecar page into the Dashboard system-page group and
  replace its runtime-log mirror with correlated lifecycle, RPC, reverse-Host,
  operation, transport, and process evidence plus selectable sanitized detail.
- Align `library.artifacts.read` transport capacity with the existing 8 MiB
  Reference Refresh admission contract while keeping general reverse-Host
  responses at 1 MiB.
- Drive memory responses by output readiness and advance by the actual written
  byte count so UTF-8 framing remains exact under partial writes.
- Preserve reverse-Host failure causality, exact attempted/limit byte counts,
  preparation cleanup, and same-process retry behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-sidecar-debug-observability`: Split production failures from the
  debug-only timeline, define the useful page projection, and require the
  independent source gate.
- `debug-diagnostics-production-isolation`: Extend artifact-based zero-byte
  release checks to the Synthesis sidecar and the executable Dashboard entry.
- `synthesis-host-artifact-read-port`: Define the capability-specific bounded
  transport needed by reference artifact reads and exact size evidence.
- `synthesis-sidecar-reference-refresh-application-foundation`: Enforce the
  aggregate materialized request bounds in both runtimes and retain retryable
  preparation semantics after Host-read failures.

## Impact

The change affects the Synthesis sidecar diagnostic contracts, Dashboard tab
projection and executable asset build, plugin/native reverse-Host transport,
Reference Refresh application admission, RPC error mapping, runtime-log
failure projection, and the existing TypeScript, Zotero, Rust, and
release-elision acceptance tests. It adds no dependency and changes no public
Synthesis client capability.
