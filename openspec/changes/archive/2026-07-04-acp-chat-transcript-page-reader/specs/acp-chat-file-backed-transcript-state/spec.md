## ADDED Requirements

### Requirement: ACP Chat transcript page reads SHALL expose stable conversation scope

ACP Chat SHALL expose a transcript page reader that returns durable transcript
store pages with explicit backend and conversation scope metadata. Existing
callers that consume page `items` SHALL continue to work.

#### Scenario: Current conversation page includes scope metadata

- **WHEN** ACP Chat code reads a transcript page for the current conversation
- **THEN** the response SHALL include `backendId`, `conversationId`,
  `requestId`, `items`, `cursor`, `total`, `eventSeq`, `transcriptRevision`,
  and `limit`
- **AND** `requestId` SHALL be stable for the backend/conversation pair.

#### Scenario: Background conversation page read does not switch active state

- **WHEN** ACP Chat code reads a transcript page for an explicit background
  conversation
- **THEN** the response SHALL use that conversation's durable transcript page
- **AND** the active conversation SHALL NOT change.

#### Scenario: Page reader flushes only the target conversation writes

- **WHEN** ACP Chat code reads a transcript page while the target conversation
  has pending transcript writes
- **THEN** the reader SHALL wait for that target conversation's writes before
  reading the durable transcript page
- **AND** it SHALL NOT require unrelated ACP Chat conversations to be flushed.

#### Scenario: Page boundary metadata is preserved

- **WHEN** ACP Chat code reads a tail page or a cursor page
- **THEN** the response SHALL preserve the durable store's `cursor`,
  `prevCursor`, `nextCursor`, `total`, and `eventSeq` page metadata.
