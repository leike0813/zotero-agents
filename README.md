# Zotero Host Bridge CLI Bundle

This branch is generated from the zotero-agents repository and contains only:

- prebuilt zotero-bridge CLI binaries under bin/
- the zotero-bridge-cli wrapper skill under skills/zotero-bridge-cli/
- assets/profile.template.json, a well-known profile template for local and remote use
- install.ps1 and install.sh for installing or upgrading the current-platform CLI
- manifest.json with source commit, platform list, sizes, and checksums

Source commit: 2598528e063108b2eb729f8305dc645081c68721
Published at: 2026-06-22T07:47:54.336Z

Use this branch as a submodule, subtree, or vendored source in projects that
need the Host Bridge CLI and its wrapper skill without embedding the full plugin
repository.

## Install or upgrade

Windows:

`powershell
.\install.ps1 --yes --json --write-profile
`

Linux/macOS:

`sh
./install.sh --yes --json --write-profile
`

The installer auto-detects the current platform. It does not accept a platform
override. Pass --install-dir or ZOTERO_BRIDGE_INSTALL_DIR only when the
default user-level location is not appropriate. Re-running the installer is an
upgrade: the target binary is replaced only when the bundled checksum differs.

For agents, use --yes --json and pass runtime configuration through
environment variables or explicit flags:

`sh
./install.sh --yes --json --write-profile --endpoint http://127.0.0.1:26570/bridge/v1 --token-env ZOTERO_BRIDGE_TOKEN
`

## Profile template and environment overrides

Copy assets/profile.template.json to the Host Bridge well-known profile location, or set
ZOTERO_BRIDGE_PROFILE to its path. The well-known profile paths are:

- Windows: %LOCALAPPDATA%\zotero-agents\bridge-profile.json
- macOS: ~/Library/Application Support/zotero-agents/bridge-profile.json
- Linux: ${XDG_DATA_HOME:-~/.local/share}/zotero-agents/bridge-profile.json

The template defaults to local loopback access and reads the bearer token from
ZOTERO_BRIDGE_TOKEN.

Environment variables override the template at runtime:

- ZOTERO_BRIDGE_ENDPOINT: endpoint URL, for example
  http://127.0.0.1:26570/bridge/v1 for local calls or
  http://<advertisedHost>:<pinnedPort>/bridge/v1 for LAN remote calls.
- ZOTERO_BRIDGE_TOKEN: bearer token supplied by the Zotero plugin or deployment
  environment.
- ZOTERO_BRIDGE_SCOPE: approval routing scope JSON. SkillRunner jobs use
  {"kind":"skillrunner-run","requestId":"...","runId":"..."} so write
  approvals return to the SkillRunner panel.
- ZOTERO_BRIDGE_CONNECTION_MODE: local or remote. Use remote for SkillRunner/LAN
  calls so file-export capabilities return Host Bridge download bundles instead
  of writing caller-local paths.
