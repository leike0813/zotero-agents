# Design

ACP SkillRunner-compatible runs absorb runtime differences inside the provider. The provider validates `result/result.json`, then creates a `bundle/` projection inside the run workspace. The projection contains the stable bundle entries expected by existing `applyResult()` hooks.

For literature digest-style output, the projection normalizes artifact paths from absolute paths, `result/...`, `artifacts/...`, or default artifact locations into:

- `result/result.json`
- `artifacts/digest.md`
- `artifacts/references.json`
- `artifacts/citation_analysis.json`

The ACP skill run panel renders real ACP session updates as the primary conversation surface. The runner captures `agent_message_chunk`, `agent_thought_chunk`, `tool_call`, `tool_call_update`, `plan`, and `usage_update` into a run-local transcript store that is separate from the normal ACP chat conversation store. Stage events remain available as system/status transcript entries and diagnostics, but they are not the substitute for agent transcript.

The panel is a run conversation workspace: header, run transcript, plan panel, interaction zone, and drawer-based run switching. Metadata, validation, dependency, workspace, projection, result JSON, and logs live in a secondary details drawer. The v1 panel supports observation, approval, cancellation, diagnostics copy, and workspace opening; it does not expose an interactive reply composer.

Dashboard ACP backend views use task rows for `skillrunner.job.v1` ACP jobs, matching SkillRunner backend management behavior. Logs remain available through diagnostics, but are not the main ACP backend tab layout.
