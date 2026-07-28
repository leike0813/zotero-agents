## Why

Manual prebuild run `30376409375` failed independently on Linux ARM64, on
durable smoke clients, and in the Windows canonical store. The seven-platform
prebuild remains release evidence only when every target passes its existing
build, smoke, package, provenance, and aggregate gates.

## What Changes

- Treat `linux-arm64` as a native Linux ARM64 build on its ARM64 runner. Keep
  its native smoke and require Zig/cargo-zigbuild only for actual Linux
  cross-build targets (`linux-x86`, `linux-x64`, and `linux-arm`).
- Send durable smoke requests through a controlled raw TCP HTTP/1.1 client,
  with explicit request framing and response-body diagnostics.
- Make Windows directory synchronization an explicit no-op while preserving
  file `sync_all`, atomic rename, transaction journal, and recovery behavior.

## Impact

- Affects the sidecar build recipe, manual prebuild workflow, release-governance
  validation, durable smoke, canonical-store platform handling, focused tests,
  and the affected OpenSpec requirements.
- Does not reuse the failed request ID, weaken any of the seven-platform
  publishing gates, publish a prebuild set, create a release, or synchronize
  Gitee.
