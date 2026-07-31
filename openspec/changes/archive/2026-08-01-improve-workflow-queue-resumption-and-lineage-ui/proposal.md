## Why

Workflow Host concurrency currently treats a long-lived execution unit and its occupied admission slot as the same lifecycle. Interactive or recoverable work therefore blocks later units while it waits, and users cannot reliably distinguish tasks that belong to different concurrent submissions.

## What Changes

- Separate execution-unit settlement from submission-slot ownership so waiting and recoverable states can yield exactly one slot.
- Give resumptions priority over not-yet-started units from the same submission while preserving independent per-submission limits.
- Require replies, authorization, retries, and Host apply to regain a slot before backend or Host work continues.
- Freeze safe provider/model display metadata and assign a stable non-numeric submission symbol for unfinished task rows.
- Keep submission decoration inside task-drawer row projection and signatures so transcript and other managed regions retain DOM identity.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-host-queue-management`: slot yielding, priority resumption, idempotent settlement, and safe submission display identity.
- `workflow-execution-seams`: typed slot coordination across provider execution and Host apply.
- `acp-skillrunner-result-apply-and-run-panel`: ACP Skills task-row submission identity and recovery-queued presentation.
- `skillrunner-provider-global-run-workspace-tabs`: SkillRunner task-row submission identity and recovery-queued presentation.
- `assistant-workspace-ui-refresh-governance`: submission decoration remains isolated to affected drawer rows.
- `acp-skills-interactive-execution`: ACP continuation and apply regain a submission slot before work proceeds.
- `acp-skills-session-recovery`: recoverable ACP continuation participates in priority resumption and cancels unsent input safely.

## Impact

The change affects the Host submission queue contracts and implementation, workflow execution seams, ACP Skills and SkillRunner run projections, shared Assistant Workspace task-row rendering, localization, focused queue/UI tests, and the queue/execution/drawer SSOT documents. It does not change provider payload schemas, persistent transcript formats, Generic HTTP or pass-through dispatch, or the independent submission concurrency model.
