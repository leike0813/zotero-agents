# Zotero Bridge CLI Bundle

This bundle installs and operates `zotero-bridge`. It contains verified platform binaries, installers, a connection-profile template, and the task-neutral `zotero-bridge-cli` Skill.

Install with `install.ps1` on Windows or `install.sh` on Linux and macOS. The profile reads its token from `ZOTERO_BRIDGE_TOKEN`; do not store bearer tokens in profile files.

Before executing a command, read `skills/zotero-bridge-cli/SKILL.md`. It links the operating contract and the generated exhaustive command reference. Verify the active executable with `zotero-bridge surface identity --json` and compare its full identity with `manifest.json` before relying on a released command contract.
