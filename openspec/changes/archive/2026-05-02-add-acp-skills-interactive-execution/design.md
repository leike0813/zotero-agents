# Design

ACP Skills v1 interactive execution separates two lifecycles:

- **Workflow task lifecycle**: `queued/running/repairing/succeeded/failed/canceled`, ending when the workflow output contract is validated and apply can run.
- **ACP conversation lifecycle**: `starting/active/ended/closed/error`, ending only when the user explicitly ends the session, cancels a non-terminal run, the ACP connection closes, or the plugin unloads.

The runner creates one ACP session per skill run. Initial prompt, output repair prompts, and later user replies all use the same `sessionId`.

ACP Skills follows SkillRunner's output convergence split:

- Each assistant turn must converge to a schema-valid JSON payload.
- Interactive pending turns use `__SKILL_DONE__: false` with `message` and `ui_hints`; these enter `waiting_user` and do not trigger apply.
- Final turns use `__SKILL_DONE__: true` plus final output fields. The runner strips the marker, validates the final payload against the skill output schema, writes `result/result.json`, and only then returns a normal `ProviderExecutionResult`.
- Repair prompts repair the assistant turn JSON. They must not ask the agent to write `result/result.json` or force the task to complete.

After final convergence, the workflow apply seam handles Zotero writeback once. The run store keeps the adapter controller alive for continued replies.

Live controllers are process-local handles, but they are not the session SSOT. Persisted ACP Skill run records retain `sessionId`, workspace paths, workflow metadata, runtime options, transcript, and apply state. When a local controller is missing, session recovery is handled by the `recover-acp-skills-sessions-and-replies` change: the runner creates a fresh adapter for the same backend/workspace, calls `resumeSession(sessionId)` or `loadSession(sessionId)`, and continues on the original remote session if the backend supports recovery.

Recovered replies for non-terminal workflow tasks are wrapped with a backend-only continuation guard. The guard reminds the agent that it is continuing the same run/session, must not restart or switch skills, must keep using the same workspace/input manifest/output contract, and must return the normal SkillRunner output JSON. The user-facing transcript still shows only the original user reply.
