# Zotero Host Bridge CLI Bundle

This repository is the integration surface for installing and calling `zotero-bridge`. Choose it when a host, agent runtime, or project needs the CLI binary, connection profile, machine-readable command contract, or low-level Host Bridge access.

For a bounded Zotero task with intent routing and evidence handoff, use the Zotero Library Agent bundle. For a resident library service with local indexing, schedules, monitoring, and maintenance policy, use the Zotero Librarian Profile.

## What this bundle provides

- verified `zotero-bridge` binaries and checksum files for all supported platforms under `bin/`;
- `install.ps1` and `install.sh` for current-platform installation and upgrade;
- the `zotero-bridge-cli` wrapper skill under `skills/zotero-bridge-cli/`;
- `skills/zotero-bridge-cli/assets/profile.template.json` for local or remote Host Bridge connection settings;
- `manifest.json` with the Release Set, exact CLI identity, source commit, and binary checksums.

This surface does not define bounded task recipes or resident jobs. Read `skills/zotero-bridge-cli/SKILL.md` before issuing commands; load its domain references only for the current operation.

## Install and connect

Windows:

```powershell
.\install.ps1 --yes --json --write-profile
```

Linux or macOS:

```sh
./install.sh --yes --json --write-profile
```

The installer detects the current platform. Use `--install-dir` or `ZOTERO_BRIDGE_INSTALL_DIR` only when the default user-level location is unsuitable. Re-running the installer upgrades the binary only when the bundled checksum differs.

The profile template reads the bearer token from `ZOTERO_BRIDGE_TOKEN`. Set `ZOTERO_BRIDGE_ENDPOINT` for a non-default endpoint, `ZOTERO_BRIDGE_SCOPE` for approval routing, and `ZOTERO_BRIDGE_CONNECTION_MODE=remote` when file results must be returned as Host Bridge download bundles. Never store a token directly in a profile file.

## Verify the exact command surface

After installation, verify the binary without connecting to Zotero:

```sh
zotero-bridge surface identity --json
```

Compare the returned protocol, CLI schema, version, build fingerprint, and command catalog checksum with `manifest.json.cliIdentity`. Compatibility is defined by that complete identity and the shared `releaseSetId`, not by a matching version string alone.

Use offline discovery instead of scanning a flat command table:

```sh
zotero-bridge surface search --intent '<task intent>' --json
zotero-bridge surface describe '<canonical command>' --json
```

## Documentation map

Start at `skills/zotero-bridge-cli/SKILL.md`. Read `identity-and-connection.md` before selecting a profile or diagnosing reachability, and `invocation-and-json-input.md` before constructing structured input. The `references/commands/` directory contains generated command cards grouped by task domain; each card documents backend source and freshness, selection and near-misses, invocation and decoded payload, result evidence, approval/effects/handles, and failure recovery. Read `output-and-recovery.md` after any structured failure or uncertain state change.

The generated cards are the operational manual. `references/host-bridge-cli.md` is an exhaustive capability/mapping inventory for diagnostics and is not the first document for task routing.

## Control and recovery

Use canonical commands and preserve returned typed handles across workflow, run, file, Product, and apply-back boundaries. Writes still require the Host-owned approval path; do not bypass Host Bridge by reading or modifying the Zotero database or storage directly.

On failure, inspect the structured error fields before retrying: `retryable`, `stateChanged`, `handleConsumed`, `safeNextActions`, and optional `nextCommand`. Re-read state when a response reports a possible state change, and do not reuse a consumed handle.

The release repository root `manifest.json` is the authority for the published bytes. Verify its `releaseSetId`, `cliIdentity`, and platform checksum before vendoring or installing the bundle.
