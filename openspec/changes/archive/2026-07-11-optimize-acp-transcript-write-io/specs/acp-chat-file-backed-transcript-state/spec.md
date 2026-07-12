## ADDED Requirements

### Requirement: ACP transcript persistence scheduling is shared and owner-scoped

ACP Chat and ACP Skills SHALL use one bounded persistence scheduling model keyed by stable transcript owner, with at most one physical writer active for each key.

#### Scenario: Drain isolates concurrent owners

- **WHEN** one owner is draining and another owner receives transcript events
- **THEN** each owner SHALL preserve its own event order and durability promise
- **AND** the second owner SHALL NOT block on or join the first owner's physical write.

#### Scenario: Events arriving during drain form the next batch

- **WHEN** new events arrive for a key while its sink is writing a detached batch
- **THEN** the new events SHALL remain pending for the next drain
- **AND** no key SHALL run more than one physical sink concurrently.

#### Scenario: Owner switch remains owner-first

- **WHEN** the selected Chat conversation/backend or ACP Skill run changes
- **THEN** the new owner loading-first or empty snapshot SHALL be published before old-owner release durability work completes
- **AND** old-owner transcript or audit flush SHALL run in the background release flow.

### Requirement: ACP Chat boundaries guarantee target transcript durability

ACP Chat SHALL flush pending transcript, required index, and metadata writes for the target conversation at durable read and lifecycle boundaries without globally draining unrelated conversations.

#### Scenario: Page read flushes only target conversation

- **WHEN** a transcript page is requested for a conversation with pending writes
- **THEN** the page reader SHALL flush that conversation before reading JSONL
- **AND** background conversations SHALL remain independently pending.

#### Scenario: Chat lifecycle boundary is cold-readable

- **WHEN** a user message is handed to the backend or the conversation reaches terminal, disconnect, end, archive, or controlled shutdown
- **THEN** the target transcript and metadata SHALL be durable
- **AND** a later cold indexed page read SHALL reproduce the complete transcript.

### Requirement: Soft ACP Chat metadata is throttled

ACP Chat soft tool and status side-channel updates SHALL use the shared trailing metadata interval while user, interaction, plan, tool-call creation, terminal, and lifecycle boundaries SHALL persist immediately.

#### Scenario: Soft status burst avoids per-event persistence

- **WHEN** many soft tool or status updates arrive for one Chat conversation within the trailing interval
- **THEN** live session state SHALL update immediately
- **AND** metadata persistence SHALL use a bounded number of physical writes.
