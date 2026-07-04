## Why

ACP v1 does not define a portable system prompt field for session setup, so ACP
Chat and ACP Skills currently rely on scattered prompt, workspace, and skill
instructions for runtime identity and Zotero access guidance.

This change introduces a small, template-owned startup preamble for the first
prompt turn so both ACP surfaces consistently tell agents where they are running
and how to access the Zotero library.

## What Changes

- Add runtime prompt templates for ACP Chat and ACP Skills startup preambles.
- Inject the ACP Chat preamble only into the first prompt of an empty chat
  conversation.
- Inject the ACP Skills preamble only into the initial run prompt, not repair or
  recovered continuation turns.
- Keep the injection as prompt text rather than a custom ACP wire field.

## Capabilities

### New Capabilities

- `acp-startup-prompt-preambles`: Defines template-backed startup preambles for
  ACP Chat and ACP Skills prompt turns.

### Modified Capabilities

- None.

## Impact

- Affects ACP runtime prompt templates, ACP Chat prompt dispatch, ACP Skills
  prompt construction, and focused core tests.
- Does not change ACP protocol request shapes, backend configuration, or public
  user-facing UI.
