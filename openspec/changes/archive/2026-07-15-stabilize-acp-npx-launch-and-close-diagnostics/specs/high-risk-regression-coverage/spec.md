## ADDED Requirements

### Requirement: ACP launch and close regressions SHALL execute in deterministic suites

High-risk ACP npx launch recovery and close-diagnostic behavior SHALL have deterministic Node coverage and a Zotero-compatible core test entry. Test selection SHALL fail when the intended Zotero test executes zero cases.

#### Scenario: Node regression suite runs without external agent dependency
- **WHEN** the ACP launch-cache, transport, client-close, and adapter regression tests run
- **THEN** deterministic fixtures SHALL exercise the required success and failure paths
- **AND** the suite SHALL NOT require a network package download or installed OpenCode agent

#### Scenario: Zotero core filter selects ACP integration test
- **WHEN** the targeted Zotero core ACP test command runs
- **THEN** the core suite entrypoint SHALL include the deterministic ACP integration test
- **AND** the gate SHALL verify that at least one test executed

#### Scenario: External OpenCode coverage remains opt-in
- **WHEN** the project runs its default deterministic test gates
- **THEN** external OpenCode ACP integration SHALL NOT be required
- **AND** the real-agent test SHALL remain available through an explicit integration-test command

