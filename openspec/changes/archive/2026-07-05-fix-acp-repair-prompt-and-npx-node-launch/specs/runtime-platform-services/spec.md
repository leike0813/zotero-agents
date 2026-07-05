## MODIFIED Requirements

### Requirement: Runtime platform services SHALL prefer node-direct npx launches for ACP stdio on Windows

When launching an ACP backend configured with the `npx` command on Windows, the runtime SHALL prefer a direct node launch of the npm npx CLI entrypoint when node and the entrypoint are available. If a node-direct launch cannot be constructed, the runtime SHALL use the existing resolved npx launch behavior.

#### Scenario: Node and npx CLI are available

- **GIVEN** a Windows ACP backend command is `npx`
- **AND** runtime command resolution finds `node.exe`
- **AND** the npx CLI JavaScript entrypoint exists
- **WHEN** ACP transport builds the launch plan
- **THEN** it SHALL launch `node.exe`
- **AND** it SHALL pass the npx CLI entrypoint before the original npx package arguments
- **AND** the user-facing command label SHALL remain based on `npx`.

#### Scenario: Node-direct npx launch cannot be constructed

- **GIVEN** a Windows ACP backend command is `npx`
- **AND** node or the npx CLI JavaScript entrypoint is unavailable
- **WHEN** ACP transport builds the launch plan
- **THEN** it SHALL fall back to the existing resolved npx launch behavior.
