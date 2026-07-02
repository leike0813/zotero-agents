# add-host-bridge-semantic-terminology-guidance

## Summary

Add shared Host Bridge terminology guidance for the Zotero Bridge wrapper skill and Zotero Librarian profile. The terminology layer helps agents map Chinese shorthand and domain phrases such as `图谱`, `三件套`, `digest`, `references`, and `writeback` to the current Host Bridge CLI, Synthesis, workflow, readiness, and mutation surfaces.

## Motivation

The generated Host Bridge surface is intentionally mechanical and command-oriented. Agents still need a semantic glossary to avoid confusing citation graph with citation analysis, generated references artifacts with skill `references/` folders, or workflow run handles with skill run handles.

## Non-Goals

- No new Host Bridge API or CLI command.
- No behavior change to workflow, mutation, readiness, or notification handling.
- No generated-output-only edits; wrapper skill, profile, and bundle references remain renderer-managed.
