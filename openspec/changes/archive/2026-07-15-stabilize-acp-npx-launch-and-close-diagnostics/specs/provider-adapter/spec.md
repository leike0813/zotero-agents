## ADDED Requirements

### Requirement: ACP adapter initialization SHALL own npx recovery attempts

The shared ACP adapter-to-transport boundary SHALL apply npx cache policy for ACP Chat, ACP Skills, and backend probes. Each physical launch SHALL be an independently cleanable initialize attempt within one logical initialization operation.

#### Scenario: Managed cache conflict is replaced cleanly
- **WHEN** the first initialize attempt qualifies for managed npx cache recovery
- **THEN** the adapter SHALL close and drain the failed connection and transport before starting the replacement
- **AND** it SHALL release the first cache lease in all success and failure paths

#### Scenario: Replaced attempt is not published as session close
- **WHEN** a failed initialize attempt is replaced by the one allowed cache recovery attempt
- **THEN** the failed attempt SHALL NOT publish `acp-connection-closed` to SessionManager
- **AND** the successful replacement SHALL become the sole published connection lifecycle

#### Scenario: Shared entrypoints use one policy
- **WHEN** ACP Chat, ACP Skills, or a backend probe initializes an ACP stdio connection
- **THEN** each path SHALL use the same adapter cache and retry policy
- **AND** callers SHALL NOT implement backend-specific npx retry branches

### Requirement: ACP npx recovery diagnostics SHALL be structured and bounded

The adapter SHALL emit one `npx_cache_retry` diagnostic when it replaces a managed-cache attempt. The diagnostic SHALL expose the retry classification and generation transition without environment values or sensitive path contents.

#### Scenario: Cache retry is observable
- **WHEN** the adapter rotates a managed cache generation and starts its replacement attempt
- **THEN** runtime diagnostics SHALL contain one `npx_cache_retry` event
- **AND** the event SHALL identify the bounded cache key, prior generation, next generation, and conflict code

### Requirement: ACP initialization failures SHALL preserve the most actionable close cause

When initialize cannot complete, the adapter SHALL choose its error cause in this priority order: receive-loop error, finalized drained stderr, nonzero process exit code, then a generic connection-close message.

#### Scenario: Receive loop fails before initialize
- **WHEN** the ACP receive loop rejects with a framing, read, or JSON-RPC error
- **THEN** adapter initialization SHALL reject with that structured receive-loop reason
- **AND** a generic close message SHALL NOT replace it

#### Scenario: Fast process exit writes stderr
- **WHEN** the ACP subprocess exits before initialize and its finalized snapshot contains stderr
- **THEN** adapter initialization SHALL expose the stderr diagnostic
- **AND** the process exit code SHALL remain available as structured metadata

#### Scenario: Process exits without stderr
- **WHEN** initialize closes without a receive-loop error or stderr
- **AND** the process exit code is nonzero
- **THEN** adapter initialization SHALL report the nonzero exit code before falling back to a generic close message

