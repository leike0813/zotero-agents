# Synthesize Topic Workflow Design

## Overview

The workflow is the boundary where ACP Skills agents generate narrative
`topic_synthesis` output, but the plugin validates and decides whether the result
can be persisted.

This change implements the result bundle contract and apply decision model. Full
filesystem persistence and Zotero mirror refresh were established as foundation
primitives but are not wired end-to-end here.

## Result Bundle

Required fields:

- `kind: "topic_synthesis"`
- `mode: "create" | "update"`
- `base_hashes`
- `topic_definition`
- `topic_resolver`
- `resolved_paper_set`
- `resolver_diagnostics`
- `artifact_metadata`
- `markdown`
- `timeline`

The bundle must not include direct write instructions for Zotero raw source,
canonical index, or note shards.

## Apply Decision

The apply decision helper:

1. validates the bundle;
2. checks base hashes against current hashes;
3. returns `persist` when safe;
4. returns `conflict` with mismatches when base hashes changed.

No Markdown auto-merge is performed.

## Workflow Skeleton

The builtin workflow manifest is added as a discoverable skeleton with provider
`acp` and hook pointers. The hook can delegate validation to compiled plugin
helpers in later wiring.
