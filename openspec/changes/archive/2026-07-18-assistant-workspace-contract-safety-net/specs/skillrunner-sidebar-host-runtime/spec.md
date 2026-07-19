## ADDED Requirements

### Requirement: Run-workspace snapshot boundary is verified behaviorally

The SkillRunner run-workspace snapshot contract SHALL be verified by tests
that capture a production `RunWorkspaceSnapshot` through the real host
assembly (`attachSkillRunnerSidebarHost` with an injected `publishSnapshot`)
and consume it through the real receiver projection
(`projectSkillRunnerPanelSnapshot`), rather than by matching source-file
text. Receiver field consumption SHALL be recorded with a recursive Proxy:
consuming a field the producer never sends SHALL fail; every curated critical
field SHALL be consumed; produced-but-unconsumed fields SHALL be reported
without failing.

#### Scenario: Phantom receiver read

- **WHEN** the receiver projection reads a snapshot field path that the
  production snapshot never provides
- **THEN** the contract test SHALL fail naming the missing path.

#### Scenario: Lifecycle snapshot semantics

- **WHEN** waiting-user, terminal, pending-interaction, and pending-auth runs
  are seeded
- **THEN** the production snapshot SHALL expose the matching status
  semantics, reply/cancel capabilities, pending interaction pass-through, and
  auth pass-through, and the receiver projection SHALL render them without
  throwing.

#### Scenario: Dialog scaffold linkage

- **WHEN** the run dialog HTML changes
- **THEN** every mount point the renderer or dialog script looks up SHALL
  exist in the document, and shared assistant panel assets SHALL remain
  referenced.
