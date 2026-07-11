# Add Collection Collector Workflow

## Summary

Add a core, no-selection SkillRunner workflow that selects existing Zotero literature for an existing collection from a required free-text scope, then applies the validated membership list through the standard workflow apply seam.

## Goals

- Require one existing Zotero collection and one free-text collection scope.
- Scan the target library through paged Host Bridge reads and use metadata, tags, and existing Synthesis Topic membership as selection evidence.
- Keep semantic assessment bounded and auditable, with a precision-first inclusion threshold.
- Keep the skill read-only and make collection membership changes only in workflow apply.
- Add a reusable required-parameter contract for workflow manifests and execution surfaces.

## Non-Goals

- No web literature search or literature ingest.
- No collection creation, tag editing, Topic mutation, graph maintenance, or source artifact generation.
- No user confirmation stage, configurable threshold, or configurable candidate limit.
