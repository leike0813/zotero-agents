# Sidecar Runtime Packaging

## Native Runtime Boundary

The Synthesis sidecar delivery unit is one product-owned Rust executable for
each supported target:

| Runtime target | Rust target triple |
| --- | --- |
| `win32-x64` | `x86_64-pc-windows-msvc` |
| `darwin-x64` | `x86_64-apple-darwin` |
| `darwin-arm64` | `aarch64-apple-darwin` |
| `linux-x64` | `x86_64-unknown-linux-gnu` |
| `linux-arm64` | `aarch64-unknown-linux-gnu` |

The runtime does not package or discover Node, npm, a JavaScript service
entrypoint, a system Rust installation, `PATH`, or a user shell. The executable
provides `serve --config <absolute-path>` and an internal `worker` mode. The
service may spawn only the same verified executable for bounded compute work.

`synthesis-sidecar-runtime-bundle.v2` is the only accepted bundle manifest. It
records:

- `implementation: "rust-native"`, service/protocol version, target and target
  triple;
- the exact executable, build fingerprint and ordered capability list;
- required `createdAt`, nullable `expiresAt`, Rust source/toolchain/Cargo lock
  provenance, and license inventory;
- platform-signature evidence and a sorted, unique file table with byte length,
  SHA-256 and executable state.

The manifest rebuilder rejects unknown fields, unsafe or duplicate paths,
target/triple drift, capability drift, invalid timestamps, incomplete license
inventory, and ambiguous executable entries. Windows uses Authenticode
evidence, macOS uses Apple code-signing evidence, and Linux records the
signature policy as not applicable. Unsigned Windows/macOS candidates are
allowed only by an explicit candidate verification policy; formal install,
freshness and synchronization fail closed.

An expired bundle cannot be synchronized, installed or newly activated. Expiry
does not terminate an already active process and does not by itself prevent the
same verified active version from restarting.

## Build and Provenance

`.github/workflows/build-synthesis-sidecar-runtime.yml` is the sole candidate
workflow. Each matrix job uses the exact nightly declared by
`native/synthesis-sidecar/rust-toolchain.toml`, with the Rust setup Action
pinned by full commit SHA. It runs Rust format, clippy and workspace tests; all
cross-language and typed-application parity checkers; license inventory; worker
and durable-service smoke; native release build; and package verification.

The workflow is read-only for pushes and manual dispatches. It uploads ordinary
workflow artifacts for inspection but does not create a release, publish a
prebuild, synchronize `addon/bin`, or advance a release pointer.

The runtime build fingerprint covers the Rust workspace, Cargo lock,
toolchain, native runtime contracts and corpus, capability contracts, packaging
policy, smoke programs and the candidate workflow. The binary provenance keeps
a separate Rust source fingerprint. Node service sources remain available as a
differential oracle and are not runtime files.

Compressed candidate budgets are hard gates:

| Artifact | Maximum compressed size |
| --- | ---: |
| One target runtime | 15 MiB |
| Five-target set | 75 MiB |
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
pointer advances only after full verification. A compatible verified v2 active
version becomes the single previous version. Corrupt installed versions are
moved under `quarantine/` before a trusted repair; they are never executed.

Rollback is explicit and can select only a complete, unexpired, policy-valid v2
bundle for the same target, implementation and protocol. Missing, incompatible,
legacy or corrupt previous versions leave the active pointer unchanged.
Concurrent `ensureInstalled()` calls share one installation transaction.

The ready installer snapshot exposes the native implementation, target/triple,
service/protocol version, build fingerprint, platform signature, immutable
install root and absolute `executablePath`. It contains no Node path or
JavaScript entrypoint.

## XPI and Synchronization Gates

The source packaging command assembles one target at a time from a caller-built
Rust binary. It writes the executable, provenance, Cargo license inventory,
product license and v2 manifest. It does not install dependencies or download
inputs.

The freshness gate verifies all five synchronized directories against the
current source fingerprint and production signature/expiry policy. The XPI
gate requires the same five native inventories below
`bin/synthesis-sidecar/<target>/`, rejects Node, JavaScript service, npm and D3
runtime files, and enforces the universal size budget.

Synchronization is a separate, explicit operation. It downloads a complete
five-target set, extracts into a staging root, verifies every target with the
production policy, and only then replaces `addon/bin/synthesis-sidecar`.
Candidate workflow success alone does not authorize synchronization.

## Migration Boundary

R9a selects the manifest-v2 Rust executable as the local production owner
through its receipt-bound cutover; Node remains a read-only differential
oracle. The retained inventory is explicitly recorded in
`artifact/synthesis_r9a_retirement_baseline_20260727.md`.

R9b separately requires five-platform remote evidence, reviewed signed assets
where applicable, synchronized XPI bytes, and explicit release authorization.
