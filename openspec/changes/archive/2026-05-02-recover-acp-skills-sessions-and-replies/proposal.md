## Why

ACP Skills currently treats the live controller as the only reply path. Once Zotero shuts down, the controller is gone and a later reply cannot resume the ACP session even though the run record still contains `sessionId`. This contradicts the ACP Chat recovery behavior and makes interactive ACP Skills unreliable.

## What Changes

- Preserve recoverable ACP Skill sessions on shutdown by detaching local controllers instead of ending remote sessions.
- Add explicit ACP Skills connection status and `Connect / Disconnect` actions for development visibility.
- Make `reply-run` recovery-aware: no live controller triggers `resumeSession`/`loadSession` before sending the reply.
- Wrap recovered non-terminal workflow replies with a continuation guard so the agent continues the same task/session instead of treating the reply as a fresh task.
- Record reply and recovery state transitions in the run transcript/events so user replies never fail silently.
- Continue a recovered `waiting_user` workflow run through the existing output convergence and apply flow.

## Capabilities

### New Capabilities

- `acp-skills-session-recovery`: ACP Skills sessions can be detached, explicitly reconnected, and recovered before replies.

### Modified Capabilities

- `acp-skills-interactive-execution`: Replaces the previous process-local-only controller assumption with persisted remote-session recovery.

## Impact

- ACP Skill run records gain connection/recovery and reply state fields.
- ACP SkillRunner-compatible orchestrator gains recovery controller creation.
- Recovered workflow replies gain a backend-only continuation guard; UI transcript still shows the original user reply.
- ACP Skills UI gains connection controls and recovery-visible composer behavior.
- Existing ACP Chat and SkillRunner REST behavior are unchanged.
