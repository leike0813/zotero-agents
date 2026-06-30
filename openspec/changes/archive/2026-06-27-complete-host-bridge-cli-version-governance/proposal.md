# Complete Host Bridge CLI Version Governance

## Summary

Close the remaining Host Bridge CLI governance gaps: release builds verify that the bundled prebuild set is current before packaging the XPI, and plugin startup prompts users to install or upgrade the user-level CLI target when it is missing or stale.

## Motivation

The CLI prebuild workflow records a build fingerprint and binary checksums, but the plugin release workflow must reject stale downloaded prebuilds before packaging. Users can also keep an old terminal CLI installed after upgrading the plugin, so startup should detect the managed install target and offer to install the current bundled binary.

## Scope

- Add a release-workflow-only freshness check for restored `addon/bin` CLI prebuilds.
- Add startup detection for the prefs-managed CLI install target.
- Prompt once per bundled CLI identity when the target is missing or stale.
- Reuse the existing CLI installer for the actual install/upgrade action.

## Out of Scope

- Adding the freshness check to `test:gate:release`.
- Treating arbitrary PATH-resolved CLI binaries as startup-managed targets.
- Changing ACP run-local CLI injection behavior.
