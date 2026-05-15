# Change: Move Synthesis Workbench To Zotero Tab And Reader

## Summary

Move Synthesis Workbench from a standalone dialog into a Zotero main-area tab and open topic artifacts in an embedded rendered Markdown reader. The workbench remains a host-owned web panel: the frontend sends actions, while the plugin host reads canonical assets and sends DTO snapshots and artifact content.

## Motivation

The dialog-hosted Workbench feels detached from Zotero's main workspace and artifact opening currently escapes to the operating system. For synthesis to be usable as a Zotero-native review surface, the Workbench needs a stable Zotero tab entry point and an internal reader that renders Markdown without exposing local file paths to frontend code.

## Scope

- Add a `synthesis-workbench` Zotero tab host using `Zotero_Tabs.add`.
- Route sidebar and menu entry points to the tab host.
- Preserve the existing `synthesis:action`, `synthesis:init`, and `synthesis:snapshot` bridge.
- Add an internal artifact reader DTO and frontend reader view.
- Render Markdown with local `markdown-it`, KaTeX, and `markdown-it-texmath` assets.
- Keep explicit folder opening as a host command.

## Out Of Scope

- Creating one Zotero tab per artifact.
- Post-MVP `Zotero_Tabs.add` compatibility fallback design.
- Raw Markdown/source editing.
- Frontend direct file or Zotero API access.
