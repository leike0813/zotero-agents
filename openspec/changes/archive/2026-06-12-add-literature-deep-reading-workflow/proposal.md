# Change: Add Literature Deep Reading Workflow

## Summary

Add a user-visible `literature-deep-reading` workflow to the built-in `literature-workbench-package`. The workflow builds a `source_bundle.zip` from the selected Zotero literature item or source attachment, runs the existing monolithic `literature-deep-reading` skill through ACP, and attaches `result/deep-reading.html` back to the target Zotero parent as an HTML attachment.

This change does not modify the skill runtime stages, does not add a debug workflow, and does not register a workflow product.

## Motivation

The `literature-deep-reading` skill can now produce a self-contained deep-reading HTML artifact, but users still need a Zotero-facing workflow entrypoint. The workflow layer should own source materialization and Zotero attachment application, while keeping semantic reading, translation, enrichment, and rendering inside the skill.

## Scope

- Add `literature-deep-reading/workflow.json` under `literature-workbench-package`.
- Add `filterInputs.mjs`, `buildRequest.mjs`, and `applyResult.mjs` hooks.
- Build `source_bundle.zip` with source Markdown or PDF fallback, rewritten local images, source manifest, and best-effort sidecar artifacts.
- Submit a `skillrunner.job.v1` request for `skill_id: "literature-deep-reading"` with `source_bundle_path` as the only input.
- Attach `result/deep-reading.html` to the target Zotero parent as a `text/html` attachment.
- Update built-in package registration and focused workflow tests.

## Out of Scope

- No new skill stage.
- No skill runtime changes unless a missing output field blocks apply-result.
- No user-selected output directory.
- No workflow product registration.
- No old SkillRunner end-to-end support guarantee.
