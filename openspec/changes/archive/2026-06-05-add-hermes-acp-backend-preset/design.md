## Design

Hermes is modeled as a normal ACP backend profile for launch purposes and as a
special ACP Skills family for skill discovery purposes.

Backend Manager keeps preset profile creation host-owned. The ACP provider
header has one menu button. Preset menu items append prefilled editable ACP
rows through the existing preset row path. The custom item appends the same
empty ACP row that the old generic ACP add button produced.

The ACP runner continues to build the shared skill catalog for every family.
For non-Hermes families it then materializes thin proxy skills into the
family-specific roots. For Hermes it skips proxy materialization and writes a
family-specific `HERMES.md` file that lists available Agent Skills from the
catalog. The requested skill is called out explicitly, and each available skill
entry prioritizes ID and `description` before catalog paths.

`description` is registry metadata sourced only from top-level YAML frontmatter
in `SKILL.md`. Missing descriptions are allowed and represented as an empty
string so existing skills without descriptions remain valid.

## Non-Goals

- Do not change normal ACP Chat launch behavior.
- Do not introduce a Hermes-specific proxy skill format.
- Do not infer descriptions from `runner.json` or markdown body content.
