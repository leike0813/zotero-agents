## Why

Assistant waiting-user replies gained an `interactionToken` in commit `36df9366` as a local stale-action guard. ACP does not define or require that token, the ACP value is derived from mutable output revision state, and SkillRunner merely duplicates its existing backend `interactionId`. The extra identity has caused valid later-turn replies to be rejected without adding a protocol capability.

## What Changes

- Remove `interactionToken` from the shared pending-interaction DTO, Assistant action payloads, ACP reply/file flows, and SkillRunner UI projections.
- Preserve SkillRunner's backend-native `interactionId` and use current canonical run state when submitting SkillRunner replies.
- Preserve the ACP reply state machine and controller serialization that existed before `36df9366`; do not replace the token with a reply-state lock.
- Revalidate canonical option/file state around asynchronous host work without introducing a replacement token or generation.
- Record the project rule “如无必要，勿增实体！” and align current Assistant interaction documentation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `assistant-shell-interaction-bridge`: Remove token fields from the shared DTO/actions while preserving bounded validation and stable managed regions.
- `acp-skills-interactive-execution`: Accept serialized waiting-user replies through the existing controller lifecycle and revalidate file interactions without a derived token.
- `skillrunner-sidebar-host-runtime`: Retain the backend interaction id without exposing a duplicate Assistant token.

## Impact

The change updates internal Assistant wire contracts, ACP Skills reply/file submission, SkillRunner run-dialog actions, focused tests, current OpenSpec requirements, and the Assistant sidebar SSOT. ACP and SkillRunner backend protocols, transcript persistence, localization, CSS, and the ACP prompt-chain state machine are unchanged.
