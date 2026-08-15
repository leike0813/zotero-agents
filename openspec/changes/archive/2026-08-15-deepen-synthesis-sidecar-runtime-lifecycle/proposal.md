## Why

The Rust sidecar's production lifecycle is split between a binary-private composition function and a listener that directly understands thirteen shared owners, their shutdown ordering, and their failure rules. The library target therefore exposes almost none of the production implementation, integration tests recompile private source files, and several post-ready lifecycle failures can bypass the bounded cleanup path.

## What Changes

- Make the existing `runtime_service` module the owner of the complete production serve lifecycle, from config loading and partial startup rollback through ready publication and terminal cleanup.
- Move the runtime module graph into the existing library target while keeping the executable as a thin CLI adapter and preserving the independent worker-mode entry.
- Replace the shared boolean lifecycle flag with an internal reason-bearing stop signal and return a typed terminal failure that preserves the primary cause plus cleanup issues.
- Keep loopback transport and capability dispatch as private internal modules with narrow roles; remove the listener's access to repository, canonical, worker, transfer, and background-task ownership.
- Route every post-ready lifecycle failure through the existing 500 ms bounded cleanup behavior while continuing to isolate request- and operation-level failures.
- Replace source-path recompilation and brittle source-line assertions with tests through the serve lifecycle interface and stable internal module interfaces.
- Preserve the existing CLI, discovery v5, health, handshake, capability, lifecycle receipt, worker, transfer, and public error-code contracts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-sidecar-runtime-foundation`: Define one library-owned blocking serve lifecycle interface, atomic ready commit, and the distinction between operation failure and lifecycle failure.
- `synthesis-sidecar-shutdown-drain`: Require every stop or post-ready lifecycle failure to use the same reason-preserving bounded cleanup path.
- `synthesis-native-worker-transfer-ownership`: Keep worker mode independent while placing the runtime graph behind the library interface and preventing lifecycle ownership from leaking into transport dispatch.
- `synthesis-invariant-guardrails`: Replace source-size proxies with semantic module-ownership and thin-executable invariants.

## Impact

The change affects the `synthesis-sidecar` library and executable targets, runtime composition/lifecycle/transport/capability modules, focused Rust and real-process tests, Synthesis ownership checks, the durable Rust source fingerprint, and current sidecar supervision documentation. It adds no dependency, schema migration, public operation, wire change, runtime fallback, release, prebuild, or publication step.
