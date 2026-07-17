# Sidecar Runtime Packaging

The repository distributes the Synthesis service with a product-owned Node
runtime. It does not discover system Node, npm, PATH entries, or user shells.
The current target matrix is:

| Target | Node asset |
| --- | --- |
| Windows x64 | `node-v24.18.0-win-x64.zip` |
| macOS x64 | `node-v24.18.0-darwin-x64.tar.gz` |
| macOS arm64 | `node-v24.18.0-darwin-arm64.tar.gz` |
| Linux x64 | `node-v24.18.0-linux-x64.tar.xz` |
| Linux arm64 | `node-v24.18.0-linux-arm64.tar.xz` |

Prebuild CI verifies the Node release's signed SHASUMS with the official Node
release keyring, checks the selected archive hash, and validates Authenticode
or macOS signing/notarization where applicable. It then combines the minimal
Node executable and license with the compiled service worker, the
`packages/synthesis-engine` JavaScript graph, the environment-neutral
`packages/synthesis-repository` foundation plus designated `node:sqlite`
adapter/owner, the environment-neutral `packages/synthesis-application`
Workbench operational query and strict Workbench contract, and the exact runtime source and
licenses for `d3-force`, `d3-dispatch`, `d3-quadtree`, and `d3-timer`.

Each platform directory contains one strict
`synthesis-sidecar-runtime-bundle.v1` manifest. The manifest identifies the
Node, service, protocol, target, build fingerprint, upstream archive, and every
runtime file's size, SHA-256, and executable state. Unsafe relative paths,
unknown fields, duplicate paths, symlinks, and incomplete runtime entrypoints
are rejected.

The build fingerprint covers service, worker, graph-transfer owner/executor,
packed graph-build engine and streaming protocol sources, shared sidecar
contracts including wire-capacity and transfer constants, synthesis-engine and
repository sources/schema/package metadata, D3
runtime package metadata and files, root package metadata, and the lockfile.
Runtime assembly never runs npm or downloads dependencies. Source verification
checks these inputs without publishing the five platform prebuilds; publication
remains part of the separate release pipeline.

## Managed Installation

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

Plugin startup now invokes the installer and launches the selected verified
runtime under the profile-scoped supervisor described in
`sidecar-runtime-supervision.md`. The launcher uses no system Node, PATH, npm,
or user shell.

The service remains production-mutation-disabled and does not access production
`synthesis.db` or Topic canonical current files. Its main process opens only the
persistent identity-bound three-table shadow repository beneath the profile
runtime root; built-in `node:sqlite` comes from the pinned Node runtime and adds
no third-party dependency or license. The default `SynthesisClient`
routes Citation Graph layout and metrics computation to its lazy bounded worker;
Unified Citation Graph build is packaged as monolithic and packed-transfer
authenticated internal canaries while its production composition remains in
process. The same bundle
contains the authenticated graph-build transfer owner, manifest contracts, and
row-page validators; sealed sessions can explicitly invoke the packed worker
and atomically publish paged output. DB reads,
graph-basis checks, promotion, canonical files, and the other production engines
remain plugin-owned. Compute JSON request and response envelopes are capped at
8 MiB and the graph-build module requires no additional runtime dependency or
asset or license.

Source routing does not regenerate platform prebuilds. Production release
freshness and XPI checks fail closed until every bundled platform runtime
matches the current service/worker/engine/repository/D3/package-version/lockfile
fingerprint produced by the separate release pipeline.
