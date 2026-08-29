## Why

Production Reference Refresh can outlive the plugin RPC timeout and then fail because individually valid Host artifact responses are aggregated into one apply request capped at 8 MiB. The resulting timeout misclassification, all-or-nothing materialization, and disconnected diagnostic identifiers make large-library refresh both unreliable and difficult to diagnose.

## What Changes

- Execute Reference Refresh as stable source-scoped batches with immediate CAS promotion, bounded binary splitting, partial-success reporting, retry convergence, and a final payload-free full-scope sweep.
- Keep preparation admission at 8 MiB/250,000 JSON nodes while deriving a separate materialized batch limit from two maximum `library.artifacts.read` responses plus fixed envelope capacity.
- Add capability-specific production operation deadlines to the shared manifest, using 60 seconds for the three Reference Refresh entry points and retaining 10 seconds elsewhere.
- Route production RPC through one manifest-owned deadline policy with a two-second transport grace and production transport error vocabulary.
- Preserve `operation_timeout` across the shared sidecar error boundary.
- Add debug-only root request correlation across plugin RPC, native RPC, Reverse Host, batch, apply, and terminal operation events while retaining production failure-only diagnostics.
- Update runtime and performance documentation and produce only the current-platform local sidecar package for retesting.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-sidecar-reference-refresh-application-foundation`: Materialized refresh becomes batch-bounded and supports source-scoped convergence rather than one aggregate full-refresh apply.
- `synthesis-native-production-routing`: Production operations use manifest-owned capability deadlines and transport grace with stable timeout and transport error categories.
- `synthesis-sidecar-debug-observability`: Debug events share a root correlation identity and expose bounded batch diagnostics without making success tracing reachable in production.

## Impact

The change affects shared Synthesis contracts, the native Rust Reference Refresh coordinator and production runtime, the plugin native production RPC composition, sidecar diagnostics and Dashboard projection, focused TypeScript and Rust tests, production capability/parity checks, and Synthesis runtime/performance documentation. It adds no dependency, database table, schema migration, remote prebuild, release, commit, or push.
