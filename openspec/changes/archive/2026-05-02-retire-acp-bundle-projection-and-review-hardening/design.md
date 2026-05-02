# Design

## Result Contract

ACP SkillRunner-compatible runs provide result data through `WorkflowResultContext`, not through a projected bundle. The provider result should be unambiguous:

- `fetchType: "result"`
- `resultJson` contains the validated final envelope payload.
- `responseJson.workspaceDir` and `responseJson.resultJsonPath` provide local artifact resolution hints.
- `responseJson.resultResolution` is `workflow-result-context`.

The apply seam may still construct a bundle reader for non-ACP providers. ACP workflows that have migrated to `resultContext` should not require a usable bundle reader.

## Review Finding Reconciliation

The review claim that ACP must wire `projectAcpSkillRunnerBundle()` is obsolete. `mineru` remains a generic-http bundle workflow and is not evidence that ACP SkillRunner-compatible runs need bundle projection.

Confirmed issues remain in scope:

- POSIX `file://` URI handling in plugin skill registry.
- ACP runtime cleanup scope separation.
- Workflow runtime global context race.
- ACP transport stderr memory growth and Mozilla pipe drain risk.
- Windows command fallback input hardening.
- Regex-only markdown sanitization.

## Compatibility

Old persisted ACP skill run records may include `bundleDir`, `projectedEntries`, or `projectionWarnings`. They are ignored when read. No migration is required.
