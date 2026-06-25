## Context

The project is moving from the historical `Zotero Skills` brand to `Zotero
Agents`. This change is a pre-rename branding pass, not a plugin identity
migration. The plugin already has users, persisted Zotero preferences, runtime
state, resource URLs, workflow payloads, and generated script globals that
depend on the old `zotero-skills` identifiers.

The design goal is to make active user-visible surfaces say `Zotero Agents`
while preserving every identifier that can affect upgrades, existing data, or
protocol compatibility.

## Decisions

### Keep Plugin Identity Stable

The following identifiers remain unchanged in this change:

- `addonID`
- `addonRef`
- `addonInstance`
- `prefsPrefix`
- `ZOTERO_SKILLS_RUNTIME_ROOT`
- `chrome://zotero-skills/` and `resource://zotero-skills/` namespaces
- `ZoteroSkills*` JavaScript globals
- existing schema names, payload kinds, marker names, and legacy detection
  strings

These values are compatibility contracts. Changing them in the branding pass
would risk duplicate add-on identity, lost preferences, broken resource lookup,
or failed reads of existing workflow and Synthesis artifacts.

### Rename Active User-Facing Surfaces

Visible labels, help text, docs, release metadata, and default-path examples use
the new names:

- Human-facing product name: `Zotero Agents`
- Repository/package/docs slug: `zotero-agents`
- Host Bridge product label: `Zotero Agents Host Bridge`

This includes current README files, site docs, locale strings, preference-page
placeholders, workspace titles, harness titles, workflow debug text, and CLI
help/package descriptions.

### Treat Default Paths Conservatively

Default runtime and documentation paths may move to the `zotero-agents` spelling
when they are newly created or only shown as examples. Existing compatibility
entry points remain readable:

- the old environment variable `ZOTERO_SKILLS_RUNTIME_ROOT` remains supported;
- old preference keys under `extensions.zotero.zotero-skills` remain the source
  of truth;
- historical roots and schema markers remain recognized where code currently
  supports them.

This avoids a hidden persistence migration inside a branding-only change.

### Generated Assets

Readable source templates and generated source-side renderer assets under
`skills_src` should reflect the new brand. The Synthesis Workbench renderer is
refreshed through `scripts/build-literature-deep-reading-graph-renderer.ts` so
the `skills_src` bundle embeds the same brand alt text as the updated source
i18n.

Rendered distribution copies under `skills_builtin` are treated as publish/build
outputs. They should not be manually rewritten in this pre-render source change
unless the relevant render/publish pipeline is intentionally run.

### Historical Material

Archived OpenSpec changes, deprecated materials, and generated artifacts are not
mechanically rewritten. Those files preserve historical state and should not be
used as current branding sources.

## Alternatives Considered

### Full Identity Rename Now

Changing `addonID`, `addonRef`, `prefsPrefix`, resource namespaces, and globals
in the same change was rejected. It would require explicit migration logic,
upgrade testing, fallback reads, and rollback handling. That is a separate
identity-migration change, not a branding preflight.

### Mechanical Repository-Wide Replacement

A broad search-and-replace was rejected because old names appear in compatibility
contracts, fixtures, historical records, and generated outputs. The change uses
surface-specific replacement instead.

## Follow-Up

A future full rename may switch persistent identifiers, but it must include a
dedicated migration design for preferences, resource namespaces, global objects,
runtime roots, generated assets, and legacy artifact readers.
