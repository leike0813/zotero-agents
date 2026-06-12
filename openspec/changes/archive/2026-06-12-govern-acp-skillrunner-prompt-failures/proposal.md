# Change: Govern ACP SkillRunner Prompt Failures

## Why

ACP SkillRunner-compatible runs currently treat an ACP prompt that returns no
assistant output as an output validation failure. That sends repair prompts even
when the backend did not produce a candidate output, such as protocol-level
stops or backend failures that are only visible through ACP request errors.

## What Changes

- Classify ACP protocol-visible prompt failures before output validation.
- Keep empty `end_turn` responses out of output repair while preserving
  result-file fallback.
- Surface recoverable prompt failures in ACP Skills run transcripts.
- Preserve backend boundaries: do not inspect OpenCode, Hermes, or other
  backend-private transcripts or logs.

## Impact

This change does not modify skill contracts, workflow manifests, result
contracts, ACP request payload shape, or backend-specific storage.
