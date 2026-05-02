## Why

ACP Skills currently behave like one-shot provider calls: after output validation succeeds the ACP process is closed, so users cannot continue the natural agent conversation from the ACP Skills panel. This blocks interactive task execution and follow-up questions after a workflow result has been applied.

## What Changes

- Reuse one ACP session for initial execution, repair prompts, and follow-up replies.
- Return the workflow `ProviderExecutionResult` when the assistant turn produces a final SkillRunner-compatible JSON payload (`__SKILL_DONE__: true`) that validates; the runner then writes `result/result.json` as its envelope and keeps the ACP conversation live.
- Enable plain-text replies from the ACP Skills panel while the conversation is active.
- Track workflow task state separately from ACP conversation state.
- Mark apply success/failure back onto the ACP skill run record.
- Keep ACP Skills transcript isolated from ordinary ACP Chat.

## Capabilities

### New Capabilities

- `acp-skills-interactive-execution`: ACP Skill runs expose a live post-result conversation and plain-text reply action.

### Modified Capabilities

- None.

## Impact

- ACP Skill run store/controller APIs gain reply/end-session and conversation/apply state fields.
- ACP SkillRunner-compatible orchestrator keeps successful sessions alive instead of closing the adapter in `finally`.
- ACP Skills UI and sidebar bridges enable `reply-run` and `end-session`.
- Workflow apply seam updates ACP skill run apply status without changing workflow-facing contracts.
- ACP output repair targets the assistant turn JSON only; it must not instruct the agent to write `result/result.json` or force task completion.
