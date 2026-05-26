# Replace Zotero Agent Icons

## Summary

Replace the plugin's bundled icon set with the new Zotero Agents icons and
align the toolbar/menu entrypoints with their intended visual roles.

## Motivation

The current icon assets mix older branding, backend-oriented icons, and
workflow shortcuts. The user-facing entrypoints should be visually distinct:
brand/favicon assets for Zotero Skills itself, a play icon for workflow
execution, a workbench icon for opening the unified workspace, and a sidebar
icon for opening the assistant/sidebar surface.

## Scope

- Replace bundled brand icons from `D:\OneDrive\Pictures\zotero-agents`.
- Add dedicated `icon_workbench.png` and `icon_sidebar.png` assets.
- Use `icon_play.png` for the workflow shortcut menu.
- Keep README and localized README logo references aligned with the bundled
  `icon_full.png` path.
- Move replaced or unused legacy icon assets to `deprecated/`.
- Keep currently used workflow document/run/settings SVG assets in place.

## Out of Scope

- Changing toolbar placement or menu behavior.
- Redesigning Dashboard/Synthesis UI layout.
- Changing README content beyond continuing to reference `icon_full.png`.
