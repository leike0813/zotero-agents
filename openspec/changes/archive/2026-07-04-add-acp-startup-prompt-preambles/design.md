## Overview

ACP Chat and ACP Skills will share a runtime-template mechanism for first-turn
startup preambles. The preamble is prepended to the text sent through
`session/prompt`; it is not represented as `systemPrompt`, `_meta`, or any other
non-standard ACP protocol field.

## Prompt Templates

Two templates live under `addon/content/acp-runtime-prompts/templates` and are
registered in the existing runtime prompt template registry:

- `acp_chat_startup_preamble.md`
- `acp_skills_startup_preamble.md`

Both templates include only lightweight guidance: the agent identity for the
current surface, workspace context, and the instruction to use the
`zotero-bridge-cli` skill / Host Bridge when Zotero library access is needed.
Backend agent-family metadata is not injected into the prompt because it does
not help the agent complete the task.

## Injection Points

- ACP Chat injects the preamble immediately before calling `adapter.prompt` when
  the conversation transcript is empty before the current user message.
- ACP Skills injects the preamble inside initial run prompt construction.
  Repair prompts and recovered continuation prompts remain unchanged.

The helper that renders and prepends the preamble is centralized so the two
surfaces do not duplicate template loading, placeholder rendering, or separator
formatting.

## Compatibility

ACP request wire shapes remain unchanged. Agents that ignore the text guidance
continue to receive the normal prompt content. Existing run-level instruction
files and runtime-patched `SKILL.md` files remain authoritative for their
current responsibilities.
