# Canonicalize Workflow Result Apply Contract

## Summary

Provider terminal results now need one canonical shape before workflow
`applyResult` hooks run. ACP already exposes business output as `resultJson`,
while SkillRunner `/result` responses can arrive wrapped as
`{ request_id, result: { data } }`. The provider/reconciler layer must normalize
that wrapper so hooks do not carry backend-specific parsing branches.

## Problem

Builtin workflow hooks still inspect legacy shapes such as `result.data`,
`resultJson.result.data`, and `responseJson.result`. Those fallbacks make hooks
repeat provider protocol knowledge and can misread raw provider diagnostics as
business output after `resultJson` has been normalized.

Bundle and artifact access has a separate problem: ACP local workspaces and
SkillRunner bundles use different physical layouts. That difference should be
hidden by `WorkflowResultContext`, not reimplemented in every hook.

## Goals

- Make `runResult.resultJson` and `resultContext.resultJson` the only business
  result source for apply hooks.
- Keep raw provider responses under `responseJson` for diagnostics only.
- Use `WorkflowResultContext.readArtifactText()` as the hook-level artifact
  resolver for ACP local paths, SkillRunner bundle entries, namespaced result
  subspaces, and legacy marker paths.
- Include the existing SkillRunner `/result` normalizer work in this change.

## Non-Goals

- Do not change ACP or SkillRunner backend protocols.
- Do not change skill output schemas.
- Do not rewrite workflow business apply semantics.
- Do not change task UI, backend health, or run lifecycle behavior.
