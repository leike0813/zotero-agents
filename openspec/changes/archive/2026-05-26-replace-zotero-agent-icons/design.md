# Design

## Asset Mapping

- `icon_32x32.png` -> `addon/content/icons/favicon.png`
- `icon_16x16.png` -> `addon/content/icons/favicon@0.5x.png`
- `icon_transparent_manual.png` -> `addon/content/icons/icon_full.png`
- `icon_play.png` -> `addon/content/icons/icon_play.png`
- `icon_workbench.png` -> `addon/content/icons/icon_workbench.png`
- `icon_sidebar.png` -> `addon/content/icons/icon_sidebar.png`

## Entrypoint Mapping

- Workflow shortcut menu root icon: `icon_play.png`.
- Execute workflow toolbar button: `icon_play.png`.
- Open Zotero Skills Workspace toolbar button: `icon_workbench.png`.
- Open assistant/sidebar toolbar button: `icon_sidebar.png`.

## Deprecated Assets

Legacy or unused icon assets are moved under
`deprecated/icons/legacy-zotero-agent-icons/` with a README that documents why
they are no longer loaded by the plugin.

Currently used workflow SVG assets remain in `addon/content/icons/` because the
Dashboard workflow cards still reference them.

