# Split Workflow Result Resolution From Apply Hooks

## Summary

Move result JSON loading, bundle reading, and artifact path denormalization into the workflow apply seam so provider-specific output layouts do not leak into every workflow `applyResult()` hook.

## Motivation

ACP SkillRunner-compatible runs can produce valid local result files without a SkillRunner-style bundle. Copying those files into a projected bundle is redundant and fragile. The common apply layer should resolve result JSON and artifacts; workflow hooks should only interpret the resolved data and apply domain-specific Zotero mutations.

## Scope

- Add a `WorkflowResultContext` passed to `applyResult()` hooks.
- Resolve `result.json` from provider result, local paths, or bundle entries.
- Resolve artifact paths from absolute local paths, bundle-relative paths, and legacy SkillRunner marker paths.
- Migrate `literature-digest` to prefer `WorkflowResultContext`.
- Keep `BundleReader`, `runResult`, `skillrunner.job.v1`, and existing workflow manifests compatible.
