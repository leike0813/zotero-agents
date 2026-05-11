# Complete Synthesis Layer MVP

## Why

The current Synthesis Layer contains useful foundations, but the production
path is still mostly skeletal. Registry and graph data can be supplied through
constructor fixtures, resolver execution returns empty results, paper artifact
reads are not wired to Zotero notes, and the Workbench/MCP/review surfaces do
not yet prove they read the same real persisted state.

## What Changes

- Add a real personal-library adapter that scans Zotero metadata, child notes,
  tags, collections, creators, and derived artifact payload markers.
- Make Paper Registry and Unified Citation Graph rebuildable projections from
  Zotero metadata plus existing derived artifact notes.
- Replace empty resolver and artifact-read shells with real topic resolver
  execution and note payload reads.
- Add the builtin ACP Skill package that the `synthesize-topic` workflow invokes
  to generate a `topic_synthesis` result bundle.
- Route MCP, Workbench snapshots, and review input through the same
  SynthesisService state without fixture-only data paths.
- Preserve existing canonical assets, mirror, write lock, and CAS behavior.

## Impact

- Extends `src/modules/synthesis/` with the MVP data-source and resolver layer.
- Hardens existing Synthesis service methods so default runtime behavior is
  backed by Zotero/mock Zotero data.
- Adds regression tests that fail if public service paths fall back to static
  empty responses.
