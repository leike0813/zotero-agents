# Design

ACP Skills uses the persisted run record as the session SSOT. A live controller is an optimization, not the source of truth.

Shutdown detaches local transport for recoverable runs. It does not call `cancel` or `endSession` unless the user explicitly requests cancellation or session end. A detached run with `sessionId` is marked recoverable.

Recovery is demand-driven. Opening the panel does not start a backend process. `Connect` explicitly recovers the session for diagnostics, and `reply-run` does the same automatically before sending text.

Recovery creates a fresh ACP adapter using the persisted backend/workspace/runtime paths. It initializes the adapter, tries `resumeSession(sessionId)`, then `loadSession(sessionId)`. Unsupported backends are marked unsupported and never replaced with a new session.

For `waiting_user` runs, recovery must continue the workflow convergence loop. The restored controller prompts the same session with the user reply, validates the next assistant turn, writes `result/result.json` only after a final payload, and applies once. For already applied succeeded runs, follow-up replies only update the conversation transcript.

## Continuation Guard

Recovered workflow replies are not sent as bare user text while the workflow task is still non-terminal. After `resumeSession(sessionId)` or `loadSession(sessionId)` succeeds, the orchestrator wraps the user reply in a short continuation guard before calling `prompt` on the original session.

The guard is deliberately narrow. It does not replay the whole task transcript and it does not create a new task. It states:

- this is the same ACP Skills run and the same remote ACP session;
- the agent must not restart the task, discard prior work, or switch skills;
- the current run workspace, input manifest, requested skill, and execution mode;
- the already injected `SKILL.md` runtime contract and output schema remain authoritative;
- the assistant turn must end with one SkillRunner output-contract JSON object;
- interactive runs may return either pending `__SKILL_DONE__: false` with `message/ui_hints` or final `__SKILL_DONE__: true`;
- the runner, not the agent, writes `result/result.json` after final validation.

The guard is only used for recovered workflow continuation. If workflow apply already succeeded, recovered follow-up chat sends the raw user message and cannot trigger a second automatic apply.

## Transcript And Diagnostics

The ACP Skills run transcript remains user-facing. It stores the original user reply so the panel does not display internal guard text. Full wrapped prompts are expected to be visible, when supported by the backend, in the backend's own transcript or debug logs. For Claude Code this can be verified in `.claude/projects/<run-workspace-slug>/<sessionId>.jsonl`.
