# Add Export Research Bundle Workflow

## Summary

Add a core, no-selection SkillRunner workflow that selects relevant Topic Synthesis reports and Zotero literature from manuscript intent, then registers a read-only multi-asset Research Bundle in Dashboard Products.

## Dependency

This change requires `support-binary-workflow-product-assets` to be implemented and validated first.

## Goals

- Accept a paper title, manuscript-style article type, and research content.
- Select up to five topics, twenty core papers, and eighty related papers.
- Export topic reports, metadata for every related paper, core source Markdown/PDF, and all v2 analysis/conversation payloads.
- Register files directly as one Product; do not create a ZIP.
- Execute discovery and selection through a recoverable SQLite skill runtime rather than relying on an agent-authored final manifest.

## Non-Goals

- No Zotero import contract.
- No Topic creation or Synthesis mutation.
- No language parameter or user confirmation stage.
