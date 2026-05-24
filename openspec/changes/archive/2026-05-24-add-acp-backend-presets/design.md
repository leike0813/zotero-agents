## Design

Backend Manager remains the owner of persisted backend profiles. The new
feature introduces a small host-side ACP preset catalog and uses it only to
create normal editable ACP rows.

Preset rows are persisted as ordinary `BackendInstance` entries:

- `type: "acp"`
- `baseUrl: "local://<id>"`
- `command`
- `args`
- `auth: { kind: "none" }`
- `acp.agentFamily`

The catalog is a pure module so tests can validate preset output without
opening a dialog. Backend Manager converts a preset backend into the existing
`EditableBackendRow` shape and reuses the normal `appendBackendRow` and
`collectBackendsFromDialog` paths.

## Presets

Initial presets cover common ACP agent tools:

- OpenCode: existing built-in OpenCode ACP command metadata.
- Codex: Zed Codex ACP adapter via npm.
- Claude Code: Zed Claude Code ACP adapter via npm.
- Gemini CLI: npm launch with experimental ACP mode.
- Qwen Code: npm launch with ACP and experimental skills mode.

OpenCode remains the only auto-created built-in backend profile. The other
presets are offered through the Backend Manager but are not automatically
persisted.

## Duplicate Handling

Each preset has a stable backend id. The Backend Manager checks visible row ids
before appending a preset and refuses duplicates with a user-facing alert. This
prevents accidental duplicate rows while still allowing users to create custom
ACP profiles manually.
