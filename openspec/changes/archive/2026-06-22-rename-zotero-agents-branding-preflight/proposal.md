## Why

The project is being renamed from Zotero Skills to Zotero Agents. Current
release surfaces still expose the old brand in plugin UI strings, README files,
published docs, Host Bridge help text, and a few default-path examples. At the
same time, several old identifiers are compatibility contracts: changing them
now would affect plugin upgrade identity, existing preferences, resource URLs,
and payload/schema compatibility.

This change performs a conservative pre-rename pass so users and published
artifacts see Zotero Agents while persistent and protocol identifiers remain
stable.

## What Changes

- Update active user-facing brand text from `Zotero Skills` / `Zotero-Skills`
  to `Zotero Agents`.
- Update active documentation and release URLs to `zotero-agents`.
- Align visible default-path examples with the current `zotero-agents`
  persistence root and WebDAV default.
- Update Host Bridge CLI and wrapper-skill help text to `Zotero Agents Host
  Bridge`.
- Keep compatibility identifiers unchanged: `addonID`, `addonRef`,
  `addonInstance`, `prefsPrefix`, `ZOTERO_SKILLS_RUNTIME_ROOT`,
  `chrome/resource` namespaces, `ZoteroSkills*` globals, and existing
  schema/payload markers.

## Capabilities

### Modified Capabilities

- `plugin-localization-governance`: visible plugin labels use the current brand.
- `runtime-persistence-governance`: visible defaults and docs reflect the
  `zotero-agents` persistence root while legacy roots remain recognized.
- `user-docs-site`: current docs and deployment metadata point at the renamed
  repository and site.
- `host-bridge-cli-interface`: CLI/package help text uses Zotero Agents
  branding without changing profile paths or command contracts.

## Impact

- No migration of existing Zotero preferences.
- No change to add-on ID, resource namespace, or generated script namespace.
- No change to archived OpenSpec history, deprecated materials, or artifact
  reports except where active release inputs consume them.
