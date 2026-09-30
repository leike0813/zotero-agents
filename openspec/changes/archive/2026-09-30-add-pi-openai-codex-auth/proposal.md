# Proposal

## Why

The Built-in Agent can select OpenAI Codex models and store encrypted Codex credentials, but it cannot sign in or execute them. C05 completes the accepted W3 authentication path before Pi Conversation integration.

## What Changes

- Add a project-owned, device-code-only OpenAI Codex login and refresh flow for the pinned Pi protocol.
- Use the existing credential store for atomic, profile-scoped token rotation and local logout.
- Extend the existing native Pi model source to execute selected Codex models without affecting API-key or keyless Providers.
- Expose request-bound connect, cancel, reconnect, and disconnect controls in the Built-in Agent page.
- Discover selectable Codex models through the official account endpoint after login or an explicit refresh, scoped to the selected credential.

## Capabilities

### New Capabilities

- `pi-openai-codex-auth`: Device-code login, token refresh, Codex Provider execution, redaction, and local logout.

### Modified Capabilities

- `backend-manager-ui`: Add user-initiated Codex account connection and redacted progress to the existing Built-in Agent page.
- `builtin-pi-provider-configuration`: Admit only credential-bound discovered Codex models, retaining unknown capability fields.
- `pi-turn-preparation`: Bound Codex output reservations by known context when discovery omits a separate output ceiling.

## Impact

Pi credential and Provider execution modules, Backend Manager host/page wire and UI, locale, focused Node/Zotero tests, and the living handoff. No new dependency, Node runtime, Backend Profile migration, or Conversation owner.
