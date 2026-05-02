# Retire ACP Bundle Projection And Review Hardening

## Summary

ACP Skills now uses `WorkflowResultContext` as its result apply contract. This change removes the old ACP bundle projection implementation and hardens review-confirmed technical debt without changing `skillrunner.job.v1` or adding new product features.

## Motivation

Recent code review feedback mixed current issues with stale assumptions. The stale part is that ACP SkillRunner-compatible runs should project a SkillRunner bundle. The current intended contract is result-context based: ACP returns `resultJson` plus local workspace path hints, and the workflow apply seam resolves artifacts through `WorkflowResultContext`.

Remaining review findings still need cleanup: misleading `fetchType="bundle"` values, stale projection code, cross-platform `file://` conversion, overly broad ACP runtime cleanup, workflow runtime global context races, ACP transport buffering/drain risks, PowerShell fallback validation, and markdown sanitization.

## Proposed Changes

- Delete ACP bundle projection code, tests, and UI/store fields that imply ACP produces a projected bundle.
- Normalize ACP SkillRunner-compatible success results to `fetchType: "result"` while preserving `resultJson`, `workspaceDir`, `resultJsonPath`, and `resultResolution: "workflow-result-context"`.
- Update OpenSpec/docs that still describe ACP bundle projection.
- Fix confirmed hardening items with narrow patches and regression tests.

## Non-Goals

- Do not restore ACP bundle projection as a compatibility path.
- Do not migrate bundle-only workflows to ACP.
- Do not perform large refactors such as splitting MCP server modules or moving test helpers out of production modules.
