# Synthesis Sidecar Runtime Packaging

The Synthesis sidecar is part of the XPI. It has no independent updater,
download channel, hot swap, runtime generation, or runtime rollback. The
installed XPI is the only source of executable bytes.

## Packaged bundle

Each supported target contains one native manifest-v3 bundle. The manifest
binds:

- the Rust executable and every companion file;
- SHA-256 and byte length for each file;
- target and target triple;
- service and protocol versions;
- capability roster;
- provenance and license inventory;
- platform-signature evidence.

Installation verifies the rebuilt manifest and every listed file before the
runtime can be launched. An optional `expiresAt` remains release-governance
metadata; it is not a local startup kill switch.

## Installed layout

```text
runtime/synthesis/service-runtime/
  current/
    manifest.json
    synthesis-sidecar[.exe]
    ...
  profiles/<profileId>/sessions/<supervisorInstanceId>/
    config.json
    discovery.json
```

`current` is the only executable selection. If its verified content matches the
XPI, startup reuses it. Otherwise the installer copies the packaged bundle to a
sibling staging directory, verifies the staged bytes, and atomically swaps it
into `current`. A staging or swap failure preserves the previous verified
current directory.

Concurrent `ensureInstalled()` calls share one installation transaction.

## Legacy files

Older profiles may still contain `active.json`, `previous.json`, `versions/`,
admission state, cutover receipts, owner files, leases, or activation evidence.
Current installation and launch do not read, rewrite, quarantine, or delete
them. They are historical files, not runtime authority.

## Release boundary

Changing sidecar bytes requires changing the XPI. Release/prebuild workflows
may still verify and assemble all supported platform bundles, but no runtime
code can fetch or promote a sidecar independently of plugin installation.
