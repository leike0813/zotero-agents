## ADDED Requirements

### Requirement: ACP Chat cleanup SHALL use the shared controller close
ACP Chat SHALL use the same bounded, idempotent shared-controller close for every local conversation lifecycle boundary.

#### Scenario: Conversation lifecycle cleanup is controlled
- **WHEN** disconnect, forced interruption, LRU eviction, initialization failure, reconnect, backend removal, or Zotero shutdown closes a local ACP Chat connection
- **THEN** ACP Chat SHALL await or reuse the owned shared-controller close
- **AND** it SHALL NOT implement process-group signaling policy.

#### Scenario: Session operations retain one controller
- **WHEN** ACP Chat creates, loads, resumes, or lazily starts a session for a prompt
- **THEN** the resulting local transport SHALL remain owned by its shared controller until the conversation ownership boundary closes it.

#### Scenario: Pending request settles on close
- **WHEN** a local ACP Chat connection closes with pending JSON-RPC work
- **THEN** pending requests SHALL fail in bounded time
- **AND** controller close SHALL not remain blocked on those requests.

