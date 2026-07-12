## ADDED Requirements

### Requirement: ACP Skills silent transcript persists only critical outcomes

In silent mode, ACP Skills SHALL NOT create transcript events or soft run persistence for assistant chunks, thoughts, tools, plans, workspace activity, ordinary statuses, or pending/invalid output projections. User replies, permission/auth/waiting state, final validated output, terminal run state, and final apply outcome SHALL remain eligible for transcript persistence.

Separate output-revision evidence SHALL retain its existing business durability and SHALL NOT cause a pending or invalid candidate to appear in the silent transcript.

#### Scenario: chunks do not reach transcript writer

- **WHEN** a silent ACP Skills run receives assistant, thought, tool, plan, and usage updates
- **THEN** transcript metadata and writer diagnostics remain unchanged
- **AND** only semantic agent-message progress may change.

#### Scenario: final envelope is written once

- **GIVEN** silent output validation has produced invalid and pending revisions
- **WHEN** a final validated envelope is accepted
- **THEN** only the final envelope is projected as a complete assistant transcript item
- **AND** revision evidence remains available outside the transcript.

