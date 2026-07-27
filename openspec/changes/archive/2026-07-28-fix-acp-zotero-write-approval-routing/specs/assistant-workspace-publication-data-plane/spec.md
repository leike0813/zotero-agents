## ADDED Requirements

### Requirement: Permission publication SHALL represent every state transition

ACP Chat and ACP Skills SHALL publish the active permission request after enqueue or promotion and SHALL publish a null request after the final request is resolved, cancelled, or discarded.

#### Scenario: The last pending permission is resolved

- **WHEN** an owner resolves its final pending permission request
- **THEN** the owner permission region SHALL receive `{ request: null }`
- **AND** unrelated transcript and managed-region DOM identities SHALL remain unchanged.

### Requirement: Internal permission kind SHALL project canonically

Permission producers SHALL classify ACP tool requests as `acp-tool` and Zotero MCP or Host Bridge writes as `zotero-write` before Assistant Workspace projection.

#### Scenario: Host Bridge requests a Zotero write

- **WHEN** a scoped Host Bridge mutation requires approval in ACP Chat or ACP Skills
- **THEN** the canonical permission DTO SHALL use `approvalKind: "zotero-write"`
- **AND** the request source SHALL remain available internally as origin metadata.
