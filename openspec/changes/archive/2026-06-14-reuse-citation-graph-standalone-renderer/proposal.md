# Reuse Citation Graph Standalone Renderer

## Why

`literature-deep-reading` now receives citation graph snapshot and Host layout data, but the final HTML renders that data through a lightweight SVG implementation. The result diverges from the Synthesis Workbench graph in node sizing, halo, edge visibility, hover labels, selection drawer, and interaction behavior.

The graph should have one visual/interaction implementation. Deep-reading can still be a self-contained HTML artifact, but it should inline a prebuilt browser renderer rather than invent a separate graph renderer.

## What Changes

- Add a reusable citation graph standalone renderer backed by `graphology` and `sigma`.
- Add a build-time bundle step that emits self-contained JS/CSS assets for skill templates.
- Keep skill runtime Python-only: Stage 40 reads prebuilt assets and inlines them.
- Replace the deep-reading SVG citation graph renderer with the standalone renderer.
- Preserve Host Bridge inputs: `citation_graph.get_slice` and `citation_graph.get_layout`.
- Add tests for graph model normalization, inline bundle presence, readonly behavior, and no runtime Node dependency.

## Impact

- Modified capability: `literature-deep-reading-skill`
- Modified capability: `synthesis-workbench-citation-graph`
- Main implementation areas:
  - shared citation graph renderer source
  - literature-deep-reading renderer templates and runtime aggregation
  - skill package generation
  - focused runtime and UI tests
