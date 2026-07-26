# Sidecar Runtime Packaging

## Approved Native Delivery Target

The formal XPI target is one product-owned native Rust executable for each supported platform. It must not contain Node, npm, a JavaScript service entrypoint, or runtime D3 packages; installation must not download Node or discover system Node, system Rust, PATH entries, or user shells. The native executable provides a service mode and may spawn the same executable in an internal worker mode so bounded CPU work remains killable without adding another packaged runtime.

The target matrix remains Windows x64, macOS x64/arm64, and Linux x64/arm64. A native runtime manifest v2 identifies the implementation kind, service/protocol version, target, executable, build fingerprint, toolchain/lock provenance, platform signature, capability inventory, and every file's size and SHA-256. It replaces Node-specific `nodeVersion`, upstream archive, Node executable, and JavaScript `entrypoint` fields. Installer snapshots expose `executablePath`; the supervisor invokes the verified executable as `serve --config <path>`.

Compressed package budgets are hard release gates:

| Artifact | Maximum compressed size |
| --- | ---: |
| One target native runtime | 15 MiB |
| All five native runtimes | 75 MiB |
| Final universal XPI | 100 MiB |

CI records uncompressed, stripped, and archived size for every target and fails any budget overrun. Native cutover keeps active/previous rollback only between compatible Rust manifest v2 bundles; it cannot activate a Node bundle as `previous`.

The detailed migration and dependency/provenance gates are defined in `artifact/synthesis_sidecar_rust_migration_plan_20260718.md`.

## Transitional Node Prebuild Baseline

The repository currently builds the frozen WS5 migration oracle with a product-owned Node runtime. It does not discover system Node, npm, PATH entries, or user shells. The five prebuilds have been published for verification but have not been synchronized into the formal XPI; together they are approximately `203,071,203` bytes. A universal Node XPI and post-install Node download are rejected, so this matrix is retained only to reproduce and compare migration behavior:

| Target | Node asset |
| --- | --- |
| Windows x64 | `node-v24.18.0-win-x64.zip` |
| macOS x64 | `node-v24.18.0-darwin-x64.tar.gz` |
| macOS arm64 | `node-v24.18.0-darwin-arm64.tar.gz` |
| Linux x64 | `node-v24.18.0-linux-x64.tar.xz` |
| Linux arm64 | `node-v24.18.0-linux-arm64.tar.xz` |

Prebuild CI verifies the Node release's signed SHASUMS with the official Node
release keyring, checks the selected archive hash, and validates Authenticode
or the macOS runtime's code signature where applicable. It then combines the
minimal Node executable and license with the compiled service worker, the
target-matching Rust Metrics executable and its source/lock/toolchain/license
provenance, the
`packages/synthesis-engine` JavaScript graph, the environment-neutral
`packages/synthesis-repository` foundation plus designated `node:sqlite`
adapter/owner, the environment-neutral `packages/synthesis-application`
Workbench operational query, private knowledge checkpoint coordinator and
strict contracts, and the exact runtime source and
licenses for the Rust `forceatlas2` crate and its transitive dependencies.

Each platform directory contains one strict
`synthesis-sidecar-runtime-bundle.v1` manifest. The manifest identifies the
Node, service, protocol, target, build fingerprint, upstream archive, and every
runtime file's size, SHA-256, and executable state. Unsafe relative paths,
unknown fields, duplicate paths, symlinks, and incomplete runtime entrypoints
are rejected.

The build fingerprint covers the pinned Rust workspace, toolchain and lockfile,
service, worker, graph-transfer owner/executor,
packed graph-build engine and streaming protocol sources, shared sidecar
contracts including wire-capacity and transfer constants, synthesis-engine and
repository sources/schema/package metadata, D3
runtime package metadata and files, root package metadata, and the lockfile.
Runtime assembly never runs npm or downloads dependencies. Source verification
checks these inputs independently of publication. Published prebuilds remain
migration evidence only; source routing does not authorize Node XPI inclusion.

## Managed Installation

The directory and atomic-install semantics below remain the product-owned executable-state boundary. They describe the current Node installer and the invariants that native manifest v2 must preserve; Node-specific paths and fields are replaced at Rust cutover rather than retained as a compatibility layer.

The installer owns only:

```text
runtime/synthesis/service-runtime/
  active.json
  previous.json
  staging/
  versions/<bundleId>/
```

It verifies packaged files before writing, copies into a unique staging
directory, repairs declared POSIX executable permissions, verifies the staged
tree, and atomically promotes the immutable version. `active.json` changes only
after the selected version is complete. A verified prior active version is
recorded in `previous.json` and can be restored by explicit rollback.

Interrupted staging, damaged packaged assets, invalid pointers, unsupported
platforms, and corrupt installed files fail closed. Repair reinstalls the
selected trusted bundle without reading or deleting paths outside the managed
root.

## Current Runtime Topology

This section describes the current frozen Node oracle, not the approved final delivery topology. New capability, production ownership, and release work follows the native target above.

Plugin startup now invokes the installer and launches the selected verified
runtime under the profile-scoped supervisor described in
`sidecar-runtime-supervision.md`. The launcher uses no system Node, PATH, npm,
or user shell.

The service remains production-mutation-disabled and does not access production
`synthesis.db` or Topic canonical current files. Its main process opens the
persistent identity-bound shadow repository and Topic canonical shadow beneath
the profile runtime root, then composes private Topic, Reference Refresh,
Reference Matching/Review, Citation Graph, Tag Vocabulary, Concept KB, and Topic Graph applications over
those isolated owners. It also composes a private knowledge checkpoint
coordinator over the Tag, Concept, and Topic Graph repositories after recovery.
The bundle includes the environment-neutral strict
Topic/Reference/Graph/Tag/Concept/checkpoint contracts, application rules and projections,
repository records/schema, and designated Node adapters. Both reference
applications, the Tag application, the Concept application, and the Topic Graph application are packaged without a Host or RPC adapter.
The checkpoint coordinator likewise has no HTTP, RPC, worker operation, or
advertised capability.
The Tag application uses two internal bounded worker operations for validation
and index construction. Concept KB uses two more for index and read-only query;
Topic Graph uses one for index construction. None is a public service capability.
The designated Node filesystem and SQLite adapters remain in service composition;
built-in `node:sqlite` and `node:fs` come from the pinned Node runtime and add no
third-party dependency or license. The default `SynthesisClient`
routes Citation Graph layout to its lazy Node Worker and Metrics computation to
the bundled Rust child through the same bounded pool;
Unified Citation Graph build is packaged as monolithic and packed-transfer
authenticated internal canaries while its production composition remains in
process. The same bundle
contains the authenticated graph-build transfer owner, manifest contracts, and
row-page validators; sealed sessions can explicitly invoke the packed worker
and atomically publish paged output. DB reads,
graph-basis checks, production promotion/canonical files, and the other production engines
remain plugin-owned. Compute JSON request and response envelopes are capped at
8 MiB and the graph-build module requires no additional runtime dependency or
asset or license.

The independent native candidate workflow builds and smokes Windows x64,
macOS x64/arm64, and Linux x64/arm64 binaries, records source provenance, and
enforces 15 MiB per-target and 75 MiB aggregate compressed limits. These
candidates do not change the v1 launch executable, entrypoint, installer,
discovery, or active/previous pointer schema.

Source routing does not regenerate platform prebuilds. The existing Node
freshness and XPI checks continue to fail closed so stale oracle assets cannot be
mistaken for release-ready assets. They do not require syncing the Node
prebuilds into the XPI. Native implementation changes will replace them with
manifest v2 freshness, five-platform provenance, inventory, and 15/75/100 MiB
size gates before the Rust cutover.
