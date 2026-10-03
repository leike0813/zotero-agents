## ADDED Requirements

### Requirement: Continuation revalidates the actual choice
A new Conversation turn after waiting, permission settlement or restart SHALL validate and freeze current applicable metadata anchored to its last actual configuration/model/reasoning unless the user explicitly changes the choice. Tool permission decisions SHALL retain original call identity and SHALL NOT regenerate or replay effects. Main, automatic compaction and title usage SHALL retain actual invocation purpose and selection.

#### Scenario: Defaults change while waiting
- **WHEN** global defaults change before a saved Conversation continues
- **THEN** it retains its actual model choice, uses newly validated facts and keeps the original pending tool identity
