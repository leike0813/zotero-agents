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

Changing sidecar bytes requires changing the XPI. The manual prebuild workflow
only constructs and publishes a seven-platform content-addressed set. Its v4
result binds build facts and the exact commit containing the immutable set; it
does not claim release eligibility and does not wait for verification.

Formal release preparation independently resolves a closed Linux/Windows/macOS
verification v2 receipt and joins it with prebuild v4 in release-set v2. The
release workflow revalidates both documents, fetches the exact recorded
prebuild commit even when the append-only branch has advanced, and atomically
materializes all seven `addon/bin/<target>/synthesis-sidecar/` roots. Runtime
code still cannot fetch or promote a sidecar independently of plugin
installation.

For routine development use:

```bash
npm run prebuild:synthesis-sidecar:dispatch -- --help
```

The command dispatches or resumes the exact run, synchronizes the local
bundles, runs freshness, and reports formal-verification status separately.
