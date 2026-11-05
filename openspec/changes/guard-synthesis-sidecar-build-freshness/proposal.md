# Proposal

## Why

An ordinary plugin build can currently package an older Synthesis sidecar runtime into a new JavaScript XPI. The existing seven-platform freshness check must block that mismatch before help-document generation or XPI packaging.

## What Changes

- Run the existing Synthesis sidecar runtime freshness check first in the ordinary `npm run build` chain.
- Reject a build when any of the seven runtime bundles is missing, stale, damaged, or bound to a mismatched build fingerprint.
- Continue the existing build chain after all seven bundles pass.
- Document the build-time gate in `AGENTS.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-sidecar-runtime-packaging`: ordinary builds verify that all seven packaged runtimes match the current source identity before producing help documentation or an XPI.

## Impact

The implementation changes the `build` script entry in `package.json` and reuses `scripts/synthesis/check-synthesis-sidecar-runtime-freshness.ts`. No runtime protocol, dependency, automatic download, release, or production service behavior changes.
