## 1. OpenSpec and Regression Coverage

- [x] 1.1 Add ACP Chat empty backend and empty conversation behavior tests.
- [x] 1.2 Add Assistant Workspace independent child-ready/init snapshot tests.
- [x] 1.3 Add guards that ordinary ACP Chat snapshot/page paths do not refresh backends or use forbidden failure-route mechanisms.

## 2. ACP Chat Empty-State Read Model

- [x] 2.1 Expose `backendAvailability` and `conversationAvailability` from ACP Chat panel snapshots.
- [x] 2.2 Skip transcript page reads whenever no backend or no conversation is selected.
- [x] 2.3 Preserve backend-only new/connect behavior when a backend exists without a conversation.

## 3. ACP Chat Child and Panel Projection

- [x] 3.1 Disable ACP Chat controls in no-backend snapshots.
- [x] 3.2 Keep backend-only new/connect controls enabled in backend-without-conversation snapshots.
- [x] 3.3 Prevent child transcript page requests and empty backend actions in empty states.

## 4. Assistant Workspace Host Initialization

- [x] 4.1 Track child readiness per tab instead of discarding inactive child ready events.
- [x] 4.2 Publish init snapshots independently for ACP Chat, ACP Skills, and SkillRunner.
- [x] 4.3 Replace refresh-and-post shell lifecycle paths with no-refresh post plus coalesced refresh-settle repost.

## 5. Verification

- [x] 5.1 Validate the OpenSpec change.
- [x] 5.2 Run focused ACP Chat/session manager tests.
- [x] 5.3 Run workspace host and UI smoke tests.
- [x] 5.4 Run TypeScript validation and touched-file formatting/lint checks.
