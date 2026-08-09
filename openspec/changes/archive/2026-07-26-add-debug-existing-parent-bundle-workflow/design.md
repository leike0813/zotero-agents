## Context

The workflow debug-probe package already verifies bundle and result apply contracts, but its shared build hook always creates a synthetic journal article before provider execution and its apply hook can create another parent as a fallback. That behavior cannot verify whether multiple prepared units preserve their existing-parent identity through ACP or SkillRunner execution.

The new probe must remain debug-only, reuse the current bundle-producing skill, and exercise the same Input Planning, provider adaptation, bundle resolution, and attachment APIs used by normal workflows.

## Goals / Non-Goals

**Goals:**

- Run one debug bundle job for each selected existing parent.
- Attach the declared bundle artifact to the parent owned by that prepared unit.
- Exercise the same workflow through SkillRunner and ACP-compatible execution.
- Fail closed when the target parent is absent or invalid.
- Reuse the current bundle skill and apply-contract implementation.

**Non-Goals:**

- Attaching the bundle archive or every file contained in a bundle.
- Changing existing debug workflows that intentionally create synthetic parents.
- Adding a new skill or changing the debug bundle output contract.
- Exposing the probe outside debug mode.

## Decisions

### Use parent-member Input Planning with `each` grouping

The workflow declares selected parent items as its atomic member and groups with `each`. This makes single-parent execution a subset of the multi-parent queue case and directly verifies that later units retain their own target.

Attachment-member input was rejected because the probe tests apply ownership, not source-file selection, and would introduce an unnecessary parent-resolution step.

### Reuse `debug-apply-bundle-probe`

Each request remains `skillrunner.job.v1`, uses `result.fetch.type: bundle`, and invokes `debug-apply-bundle-probe`. The apply contract consumes `result/debug-apply-artifact.txt`, so both SkillRunner and ACP-compatible execution traverse their existing shared bundle-reader seam.

Creating a second skill was rejected because the existing skill already produces the exact deterministic artifact needed by the probe.

### Separate strict target selection from the legacy synthetic-parent behavior

A new build hook resolves exactly one parent from the prepared unit and writes its ID to `targetParentID`; it never calls item creation. It reuses the existing request builder so the skill receives the required dynamic workflow, step, and run parameters without duplicating the job contract.

A thin existing-parent apply wrapper validates `request.targetParentID`, resolves the live parent, and delegates to the existing apply hook with that explicit parent. Existing workflows and their synthetic-parent fallback remain unchanged. The wrapper throws before bundle materialization or Zotero mutation if the request target is absent or no longer resolves.

Special-casing the workflow ID inside the legacy hook was rejected because it would hide two ownership policies in one implicit branch.

### Attach only the declared primary artifact

The probe attaches `result/debug-apply-artifact.txt`, preserving the current apply-bundle contract and one-result/one-attachment expectation. Artifact-manifest and multi-file behavior remain covered by their dedicated probes.

## Risks / Trade-offs

- **Shared request-builder export could affect legacy probes** → Export the existing pure builder without changing its implementation and rerun the complete debug-probe suite.
- **A weak test could pass without queue isolation** → Use two existing parents and assert each receives exactly its own generated attachment.
- **Provider-specific behavior could diverge** → Exercise the same workflow through both SkillRunner and ACP-compatible bundle paths.
- **Invalid targets could leave partial state** → Resolve and validate the parent before materializing or attaching the artifact.

## Migration Plan

No migration is required. The workflow is additive and debug-only. Rollback consists of removing the new workflow, wrapper hooks, registrations, and tests; existing debug workflows retain their current behavior.

## Open Questions

None.
