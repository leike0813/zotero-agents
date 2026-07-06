## MODIFIED Requirements

### Requirement: Host Bridge lists active workflow tasks

Host Bridge SHALL expose a lightweight active task endpoint for agent control
decisions, and the CLI SHALL expose it as `zotero-bridge run active`.

#### Scenario: Client lists active tasks

- **WHEN** an authenticated client requests active tasks through
  `GET /bridge/v1/tasks/active` or `zotero-bridge run active`
- **THEN** the bridge SHALL return only running, waiting, and failed-retriable task handles
- **AND** each row SHALL include workflow run id, skill run id, workflow id, task name, state, liveness, update timestamp, sequence metadata when known, and action flags
- **AND** the response MUST NOT expose transcripts, local paths, full error text, or provider-private payloads.

#### Scenario: ACP active handle is derived from run summary

- **GIVEN** an ACP Skills run is active according to ACP status classifiers
- **AND** no legacy ACP workflow task row exists for that request
- **WHEN** an authenticated client requests active tasks
- **THEN** the bridge SHALL return an active task handle for the ACP run
- **AND** the handle SHALL be derived from the ACP run summary.

#### Scenario: Legacy ACP task row does not create active handle

- **GIVEN** a legacy ACP workflow task row exists for a request
- **AND** the ACP run store has no active ACP run for that request
- **WHEN** an authenticated client requests active tasks
- **THEN** the bridge SHALL NOT return an ACP active handle for the legacy row.
