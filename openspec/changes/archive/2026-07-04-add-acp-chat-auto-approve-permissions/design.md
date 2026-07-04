## Design

ACP Chat stores `autoApproveAcpPermissions` on the conversation snapshot. The
setting is copied through the existing clone/parse/persist paths and is reset to
`false` for new conversations.

Permission handling reuses the ACP allow-option policy already used by ACP
Skills: auto-approval only applies to `source: "acp-tool-call"`, prefers the
first `allow_once` option, falls back to the first `allow_always` option, and
leaves all other requests pending for manual user action.

The banner control is modeled as a shared Assistant context action with toggle
metadata. The ACP Chat child page forwards the toggle action to the host with
the active `backendId` and `conversationId`; the host calls the session manager
setter and republishes the snapshot.

## Risks

- A conversation-scoped persisted setting can surprise users after reconnect.
  The banner control remains visible whenever the conversation is active.
- Permission source classification must stay strict so Host Bridge and Zotero
  write approvals are not auto-approved through this ACP tool setting.
