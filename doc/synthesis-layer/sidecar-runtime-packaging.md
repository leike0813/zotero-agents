# Sidecar Runtime Packaging

## Native Runtime Boundary

The Synthesis sidecar delivery unit is one product-owned Rust executable for
each supported target:

| Runtime target | Rust target triple |
| --- | --- |
| `win32-x64` | `x86_64-pc-windows-msvc` |
| `darwin-x64` | `x86_64-apple-darwin` |
| `darwin-arm64` | `aarch64-apple-darwin` |
| `linux-x86` | `i686-unknown-linux-gnu` |
| `linux-x64` | `x86_64-unknown-linux-gnu` |
| `linux-arm` | `armv7-unknown-linux-gnueabihf` |
| `linux-arm64` | `aarch64-unknown-linux-gnu` |

The runtime does not package or discover Node, npm, a JavaScript service
entrypoint, a system Rust installation, `PATH`, or a user shell. The executable
provides `serve --config <absolute-path>` and an internal `worker` mode. The
service may spawn only the same verified executable for bounded compute work.

`synthesis-sidecar-runtime-bundle.v3` is the only accepted bundle manifest. It
records:

- `implementation: "rust-native"`, service/protocol version, target and target
  triple;
- the exact executable, build fingerprint and ordered capability list;
- required `createdAt`, nullable `expiresAt`, Rust source/toolchain/Cargo lock
  provenance, and license inventory;
- a sorted, unique file table with byte length, SHA-256 and executable state.

The manifest rebuilder rejects unknown fields, unsafe or duplicate paths,
target/triple drift, capability drift, invalid timestamps, incomplete license
inventory, and ambiguous executable entries. Production admission is based on
the complete file inventory and exact content-addressed release evidence; code
signing is not a bundle admission prerequisite.

An expired bundle cannot be synchronized, installed or newly activated. Expiry
does not terminate an already active process and does not by itself prevent the
same verified active version from restarting.

## Build and Provenance

`.github/workflows/prebuild-synthesis-sidecar-runtime.yml` is the sole
seven-platform prebuild workflow. It accepts only an explicit `request_id` and
full `source_sha`; it does not run on push. Its plan job validates and expands
`native/synthesis-sidecar/build-recipe.json`, the single source for the seven
target runners, Rust triples, smoke eligibility, and pinned Node/Rust/Zig/
`cargo-zigbuild` versions. Linux candidates use the recipe-pinned Zig build
path and do not install distribution cross-GCC packages. Each job runs Rust
format, clippy and workspace tests; all cross-language and typed-application
parity checkers; license inventory; worker and durable-service smoke where the
candidate is runnable; native release build; and package verification.

The workflow creates one content-addressed prebuild set only after all seven
candidate jobs succeed. It does not create a GitHub Release, synchronize local
`addon/bin`, or advance a plugin release pointer.

The runtime build fingerprint covers the Rust workspace, Cargo lock,
toolchain, native runtime contracts and corpus, capability contracts, packaging
policy, smoke programs and the explicit prebuild workflow. The binary provenance keeps
a separate Rust source fingerprint. Node service sources remain available as a
differential oracle and are not runtime files.

Compressed candidate budgets are hard gates:

| Artifact | Maximum compressed size |
| --- | ---: |
| One target runtime | 15 MiB |
| Seven-target set | 75 MiB |
| Final universal XPI | 100 MiB |

The release license inventory covers every Cargo lock package, the bundled
SQLite component, the product AGPL license and the exact inventory referenced
by provenance.

## Managed Installation

The installer owns only:

```text
runtime/synthesis/service-runtime/
  active.json
  previous.json
  staging/
  quarantine/
  versions/<bundleId>/
  profiles/
```

Both active and previous pointers use
`synthesis-sidecar-runtime-pointer.v2`. A legacy v1 pointer is not executable
and is never eligible for rollback.

Installation verifies packaged bytes before writing, copies into a unique
staging directory, repairs declared POSIX executable permissions, verifies the
complete staged tree, and atomically promotes an immutable version. The active
pointer advances only after full verification. A compatible verified v3 active
version becomes the single previous version. Corrupt installed versions are
moved under `quarantine/` before a trusted repair; they are never executed.

Rollback is explicit and can select only a complete, unexpired, policy-valid v3
bundle for the same target, implementation and protocol. Missing, incompatible,
legacy or corrupt previous versions leave the active pointer unchanged.
Concurrent `ensureInstalled()` calls share one installation transaction.

The ready installer snapshot exposes the native implementation, target/triple,
service/protocol version, build fingerprint, platform signature, immutable
install root and absolute `executablePath`. It contains no Node path or
JavaScript entrypoint.

Runtime admission resolves an installed version by exact build fingerprint and
passes that verified snapshot directly to the supervisor. Current and pending
generations therefore remain launchable even if the mutable active pointer
advances during an attempt. Pre-activation recovery selects the exact previous
admitted snapshot; it does not reinterpret `previous.json` as production
authority or copy executables into a data backup.

## XPI and Synchronization Gates

The source packaging command assembles one target at a time from a caller-built
Rust binary. It writes the executable, provenance, Cargo license inventory,
product license and v3 manifest. It does not install dependencies or download
inputs.

The freshness gate verifies all seven synchronized directories against the
current source fingerprint and expiry policy. The XPI gate requires the same
seven native inventories below
`bin/<target>/synthesis-sidecar/`, rejects Node, JavaScript service, npm and D3
runtime files, and enforces the universal size budget.

Synchronization is a separate, explicit operation. It downloads a complete
seven-target set, extracts into a staging root, verifies every target, and then
transactionally replaces the complete `addon/bin` tree with each bundle at
`addon/bin/<target>/synthesis-sidecar/`. Existing Host Bridge binaries are
copied unchanged into the staged tree; the obsolete sidecar-first root is not
retained.
Candidate workflow success alone does not authorize synchronization.

## Migration Boundary

R9a selects the manifest-v3 Rust executable as the local production owner
through its receipt-bound cutover; Node remains a read-only differential
oracle. The retained inventory is explicitly recorded in
`artifact/synthesis_r9a_retirement_baseline_20260727.md`.

R9b separately requires seven-platform content-addressed evidence,
synchronized XPI bytes, and explicit release authorization.
