## Why

Synthesis KG foundation now provides a canonical store and projection registry, but the controlled tag vocabulary is still managed primarily through the legacy tag-manager workflow and prefs state. Moving tag vocabulary into the Synthesis canonical store gives tag-regulator, ingest, digest, synthesis, and the Workbench a single source of truth before later Topic Graph, Concept KB, Citation Graph, and Git Sync phases build on the same pattern.

## What Changes

- Add a Synthesis tag vocabulary domain backed by canonical files under `synthesis/tags/`.
- Add protocol validation, import/export, merge-preview conflict handling, receipts, diagnostics, and a rebuildable `tag-index` projection model.
- Add a Tags page to the Synthesis Workbench as the new primary tag vocabulary management surface.
- Make tag-regulator request building prefer the Synthesis canonical vocabulary while retaining the existing prefs-based fallback.
- Keep the legacy tag-manager workflow available for compatibility; do not remove or rewrite it in this change.
- Do not implement Topic Graph, Concept KB, Citation Graph, Git remote sync, tag marketplace, package registry, multi-source subscription, or real SQLite projection storage.

## Capabilities

### New Capabilities

- `synthesis-tag-vocabulary`: Canonical tag vocabulary files, protocol validation, import/export, projection state, diagnostics, and tag-regulator export.

### Modified Capabilities

- `synthesis-workbench-ui`: Add Tags as a Workbench page for managing the Synthesis tag vocabulary.
- `tag-regulator-workflow`: Prefer the Synthesis canonical vocabulary for `valid_tags` generation and fall back to the existing prefs vocabulary when canonical state is unavailable.
- `tag-vocabulary-management-workflow`: Clarify that the legacy tag-manager workflow remains compatible but is no longer the primary tag vocabulary management path.

## Impact

- Affects Synthesis foundation/service/UI code, workflow host API exposure, and the tag-regulator buildRequest hook.
- Adds focused core tests for Synthesis tag vocabulary and extends existing Synthesis UI and tag-regulator workflow tests.
- Adds no npm dependency and does not change Git history, branch state, development server behavior, or external MCP surfaces.
