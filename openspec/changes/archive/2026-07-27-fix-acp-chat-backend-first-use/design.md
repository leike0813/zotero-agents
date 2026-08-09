## Context

Backend Manager persistence already updates the ACP backend cache and emits a
typed global `backend` workspace change. ACP Chat's owner navigation therefore
contains the newly saved backend immediately, but the shared panel model uses a
selected conversation owner as the proxy for backend availability. A first-use
state has navigation groups and a selected backend but no owner, so the model
incorrectly projects the no-backend chrome.

Connect is also registered as a selected-owner action. Supporting the existing
backend-level Connect contract requires routing it through the selected
navigation group and establishing a durable local conversation before opening
the ACP connection.

## Goals / Non-Goals

**Goals:**

- Project no-backend, backend-without-conversation, and selected-conversation
  states independently.
- Make a newly saved ACP backend usable without a plugin restart.
- Give backend-level Connect the same persistent local conversation ownership
  as New Conversation.
- Reuse the current backend selection, placeholder, persistence, and workspace
  publication path.

**Non-Goals:**

- Adding another backend refresh or preference observer.
- Changing backend persistence, transcript storage, external ACP APIs, or
  Assistant transcript rendering.
- Adding new action names, wire message types, or localization.

## Decisions

### Navigation groups are the backend-availability SSOT

ACP Chat will derive backend availability from owner navigation groups and use
`selectedGroupId` as the selected backend. A missing conversation owner only
disables conversation-scoped controls. This keeps backend catalog projection
separate from conversation ownership and avoids duplicating backend state in the
child model.

### Connect is a navigation-group action

The existing `connect` action will use the existing `navigation-group` action
scope with payload `{ groupId }`. The shared host bridge already validates the
group and maps it to `backendId`, so no new action or transport contract is
needed. Selected-conversation Connect continues to target the active
conversation within the selected backend.

### Backend-only Connect reuses the existing connection path

`connectAcpConversation` already materializes and selects one local conversation
when called with a backend id and no explicit conversation id. It also retains
that conversation with error diagnostics if ACP initialization fails. The
change will expose that established behavior through the navigation-group
action contract rather than adding another selection or placeholder path.

## Risks / Trade-offs

- [Changing Connect scope could select the wrong conversation] → Preserve the
  existing host mapping from the validated navigation group to `backendId` and
  cover selected-conversation behavior with the existing connection path.
- [Repeated backend-level Connect could create duplicates] → Reuse the existing
  placeholder/active-session selection path and cover idempotent reuse.
- [Empty-state changes could affect ACP Skills or SkillRunner] → Restrict
  backend availability logic to the ACP Chat projection and retain existing
  owner rules for other sources.
- [Panel refresh could disturb transcript regions] → Change only selector and
  action projection; do not add transcript fields to shared region signatures.
