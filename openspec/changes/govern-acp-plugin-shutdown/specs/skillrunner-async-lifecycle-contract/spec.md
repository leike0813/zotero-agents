## MODIFIED Requirements

### Requirement: SkillRunner async modules MUST use stop-and-drain lifecycle semantics

SkillRunner background async modules MUST follow a shared lifecycle contract so
production shutdown and test teardown can stop stale work without mutating core
business behavior. Plugin-level shutdown SHALL run cleanup steps with bounded
best-effort semantics so one stalled async cleanup does not block later cleanup
steps or Zotero process exit.

#### Scenario: Stop invalidates old background generations

- **WHEN** a SkillRunner async module is stopped
- **THEN** it invalidates the current generation immediately
- **AND** old background work may finish awaiting but MUST NOT keep producing
  new side effects or reschedule itself

#### Scenario: Drain waits for in-flight work to unwind

- **WHEN** tests or shutdown paths call drain-aware cleanup
- **THEN** the module waits for in-flight async work from the invalidated
  generation to unwind before clearing test-owned state

#### Scenario: Generation guards stay at async boundaries

- **WHEN** generation invalidation is implemented
- **THEN** guards are applied only at async loop boundaries and post-await
  side-effect boundaries
- **AND** core business-state transitions remain unchanged

#### Scenario: Plugin shutdown step timeout does not block later cleanup

- **GIVEN** a plugin shutdown step returns a promise that does not settle
- **WHEN** top-level plugin shutdown runs
- **THEN** the shutdown runner SHALL continue after the bounded timeout
- **AND** later shutdown steps SHALL still run
- **AND** the timeout SHALL be recorded as a shutdown diagnostic or runtime log.
