# Change: Add ACP Streaming Render Toggle

## Summary
Add a global ACP streaming render preference for ACP Chat and ACP Skills. The
preference remains enabled by default. Users can disable it from Preferences or
from the ACP Chat / ACP Skills toolbar to reduce UI churn on low-performance
machines.

## Motivation
Streaming transcript updates can repeatedly refresh the Assistant Workspace
conversation window while a backend is emitting text chunks. On slower machines
this can make the Zotero UI feel unresponsive even though the transcript data
itself is valid.

## Non-goals
- Do not change ACP transport or require backends to stop streaming.
- Do not change SkillRunner UI or SkillRunner runtime behavior.
- Do not change workflow result validation, output convergence, or final
  transcript persistence semantics.

## Scope
- Add one global preference, defaulting to streaming render enabled.
- Show the same state in Preferences, ACP Chat, and ACP Skills.
- When disabled, continue accumulating text chunks but avoid chunk-by-chunk
  transcript rendering. Refresh at observable message boundaries such as
  text-to-non-text transitions and prompt completion/error/cancel.
