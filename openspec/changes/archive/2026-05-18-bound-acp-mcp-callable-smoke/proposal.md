# Bound ACP MCP Callable Smoke

## Why

When MCP is correctly injected into an ACP session, callable smoke usually
completes quickly. When injection is broken, the agent may spend a long time
trying alternative paths such as config searches, shell commands, or guessed
tool names. This wastes time before the run can fail.

## What Changes

- Add a hard timeout to ACP callable smoke. The production default is 60
  seconds.
- Fail the run when smoke times out before the business prompt is sent.
- Strengthen the smoke prompt so the agent only calls declared required MCP
  tools and does not try alternative access paths.
- Move smoke/guard prompt bodies into packaged ACP runtime prompt templates under
  `addon/content/acp-runtime-prompts/templates`, separate from ACP skill patch
  templates because they are injected by the orchestrator at a different phase.
- Move the recovered-session continuation guard into the same ACP runtime prompt
  template family and keep these runtime prompt templates in English to match
  the rest of the ACP execution prompt surface.

## Impact

- Affects ACP SkillRunner-compatible orchestration for workflows declaring
  required MCP tools.
- Does not change Zotero MCP tools, workflow manifests, topic synthesis runtime,
  or Workbench UI.
