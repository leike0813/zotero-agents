## MODIFIED Requirements

### Requirement: ACP Chat persists conversation message-count metadata

ACP Chat SHALL persist Assistant, Thought, and Tool current/cumulative count
metadata with the conversation owner state. Count metadata SHALL be updated
before display-mode suppression and SHALL remain available after prompt
settlement and restart without changing transcript JSONL or index schemas.

An ACP Chat conversation with no transcript history and no persisted count
metadata SHALL initialize complete zero-valued metadata. A conversation with
prior transcript history but no persisted count metadata SHALL remain
unavailable until its next user-originated prompt. That prompt SHALL establish
a new observed cumulative epoch with zero baseline before new protocol activity
is counted, and the resulting complete metadata SHALL be persisted.

#### Scenario: cold owner exposes counts before transcript mirror

- **WHEN** a conversation with complete count metadata is selected after restart
- **THEN** its message counter can be populated from conversation metadata
- **AND** transcript page rendering does not wait for full mirror hydration.

#### Scenario: empty conversation initializes an x/y counter

- **WHEN** an ACP Chat conversation has no transcript history or count metadata
- **THEN** it restores complete zero-valued Assistant, Thought, and Tool counts
- **AND** its counter can render each category as `0/0`.

#### Scenario: legacy prompt establishes an observed cumulative epoch

- **WHEN** a conversation has prior transcript history but lacks count metadata
- **AND** the user starts its next prompt
- **THEN** current and cumulative counts start from zero before new semantic activity
- **AND** the persisted counter thereafter renders the current execution over the observed cumulative epoch.

#### Scenario: user prompt resets current only

- **WHEN** the user starts another prompt in the same conversation with complete count metadata
- **THEN** current Assistant, Thought, and Tool counts reset
- **AND** cumulative conversation counts are retained and continue advancing.

#### Scenario: silent updates do not touch transcript index

- **WHEN** silent Thought or Tool activity advances count metadata
- **THEN** the conversation count summary is updated
- **AND** transcript item count, event sequence, writer entries, and index schema remain unchanged.
