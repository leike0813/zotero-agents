## Design

The shared icon layer is CSS-mask based so page code can use stable semantic classes such as `zs-icon-dashboard` without embedding SVG path data in renderers. The SVG files are a small local Material Symbols Rounded subset under `addon/content/icons/material-symbols/`.

Browser documents that render these icons load `../shared/icons.css` or the equivalent relative path. The shared classes set size, mask sizing, `currentColor`, and decorative behavior; buttons keep their existing text, title, and aria labels.

Workspace sidebar state remains host-owned. `workspaceTab.ts` derives `sidebarOpen` from `isAssistantWorkspaceSidebarOpen()` when posting snapshots. The browser shell uses that projection to render `right_panel_open` when closed and `right_panel_close` when open.

Brand and host-entry icons remain unchanged because they are plugin identity and Zotero toolbar assets, not in-page action glyphs.
