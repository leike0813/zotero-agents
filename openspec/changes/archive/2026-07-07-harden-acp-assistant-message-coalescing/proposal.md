## Why

ACP Chat and ACP Skills currently assume ACP backends provide clean assistant
message boundaries. Real ACP update streams can interleave assistant text with
tool side-channel updates, especially `tool_call_update`, which causes the
plugin transcript normalizer to split one assistant sentence into multiple
`message:assistant` items.

## What Changes

- Add a protocol-level ACP transcript coalescing rule for assistant text chunks.
- Treat tool updates, usage updates, status events, and workspace activity as
  soft side-channels that do not end an active assistant text segment.
- Keep new tool calls, user messages, plan/permission/user interaction, explicit
  turn boundaries, and request terminal states as hard boundaries.
- Apply the same boundary classification to ACP Chat and ACP Skills.
- Document that message coalescing must not depend on backend/provider names.

## Impact

- `src/modules/acpSessionManager.ts`: ACP Chat transcript update handling.
- `src/modules/acpSkillRunStore.ts`: ACP Skills transcript update handling.
- New internal helper for ACP transcript boundary classification.
- Tests in ACP Chat and ACP Skills transcript suites.
- Project-level `AGENTS.md` hard rule for ACP transcript projection.
