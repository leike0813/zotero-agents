# Change: Citation Role Filter From Literature Analysis Artifacts

## Why

The Synthesis citation graph exposes a role filter, but graph edges currently
fall back to generic citation values because reference sidecar ingestion does
not persist citation-analysis roles. Literature-analysis artifacts can provide a
best-effort `function` for each cited reference, and the Workbench should use
that signal without treating it as authoritative truth.

## What Changes

- Extract best-effort citation roles from `citation_analysis.items[].function`
  and compatible legacy shapes.
- Persist normalized roles on raw references and project them into citation
  graph edge `rolesJson`.
- Wire both reference sidecar refresh and literature-analysis workflow apply
  through the same role extraction path.
- Keep the graph citation-role filter visible, exclude the generic `citation`
  value, and localize known role labels.

## Impact

This change adds a raw-reference cache column and expands the optional
literature-analysis apply input. Snapshot DTO field names, graph filter actions,
workflow contracts, and literature-analysis skill generation rules remain
unchanged.
