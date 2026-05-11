# Synthesis Review Input Contract

This document records the v1 input contract that future literature review
workflows should consume from Synthesis Layer.

## Contract

The review workflow input is a JSON-safe DTO with kind
`synthesis.review_workflow_input`.

It contains:

- topic synthesis Markdown;
- topic synthesis metadata;
- saved Topic Definition and Topic Resolver snapshot;
- saved Resolved Paper Set snapshot;
- Paper Registry readiness rows for resolved papers;
- Unified Citation Graph slice for resolved papers;
- missing artifact diagnostics;
- topic timeline content from the topic synthesis artifact.

The DTO uses portable paper refs such as `libraryId:itemKey`. Zotero numeric
item ids are not the primary identity contract.

## MCP Entry

The read-only MCP tool is:

```text
synthesis.get_review_input
```

The tool accepts a `topicId` and optional size/slice controls. It returns the
review input DTO through the Synthesis service. It does not write assets, rerun
topic resolver, or trigger agent synthesis.

## Boundaries

Synthesis Layer v1 does not provide these review-specific assets:

- method lineage graph;
- claim conflict graph;
- research gap graph;
- topic timeline graph;
- generated review prose.

Those may be produced by later workflows, but they are not Synthesis Layer v1
canonical infrastructure.
