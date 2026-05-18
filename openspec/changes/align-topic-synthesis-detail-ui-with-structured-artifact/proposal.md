# Align Topic Synthesis Detail UI With Structured Artifact

## Summary

Topic Synthesis Detail currently opens inside the generic Workbench reader shell.
That creates nested surfaces and duplicate titles, and it only exposes the older
Overview/Claims/External/Coverage view of the artifact.

This change upgrades Topic Detail into a full-height structured workbench that
uses the current structured artifact sections and follows the approved detail UI
tokens and mockup.

## Goals

- Render structured Topic Detail in its own shell instead of inside the generic
  Workbench content shell.
- Use one topic title/topbar only.
- Add six top-level detail tabs: Overview, Taxonomy, Claims, Compare, External,
  Coverage.
- Keep Markdown export/copy/open folder as secondary actions.
- Keep the existing Home, Topics, Graph, Index, and Markdown reader behavior.

## Non-Goals

- Do not change topic synthesis persistence contracts.
- Do not introduce a UI framework or new icon package.
- Do not redesign Home/Topics/Graph/Index.
- Do not start a development server as part of verification.
