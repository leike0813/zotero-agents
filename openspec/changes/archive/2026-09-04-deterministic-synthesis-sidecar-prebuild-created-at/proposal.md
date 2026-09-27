## Why

Binding `manifest.json.createdAt` to the source commit removed the known
wall-clock input, but a second same-source prebuild still failed while
publishing the immutable set. The cache resolver admitted artifacts from other
source SHAs whenever their build fingerprints later validated. Those bundles
retain the donor source identity, so a mixed cache cannot be the exact output
of the requested source. Windows symbols had the same identity problem because
different sources shared `symbols/<buildFingerprint>/win32-x64`.

Windows also resolves bare `tar` to the system bsdtar, while deterministic
staging uses GNU-only options and Git for Windows supplies the required GNU
tar. Native backslash paths passed through `tar -C` are not portable between
those implementations.

## What Changes

- Reuse artifacts only from workflow runs whose `head_sha` equals the requested
  source SHA.
- Extract downloaded runtime archives with the output directory as `cwd` and a
  relative forward-slash archive path.
- Resolve Git for Windows GNU tar and gzip as one governed subprocess runtime;
  use working directories and relative archive paths for listing and extraction.
- Store Windows symbols under `symbols/<sourceSha>/win32-x64`, byte-verify a
  repeated publication, and distinguish runtime-set and symbol conflicts.
- Keep the already-landed source-derived RFC3339 UTC `createdAt` value.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-sidecar-prebuild-release`: Require source-exact cache reuse,
  portable cache extraction, and source-addressed Windows symbols.

## Impact

- Synthesis sidecar archive governance, staging, download, synchronization,
  publication, cache resolution, and their existing tests
- No runtime, plugin, schema, release-set, feed, or Gitee change
