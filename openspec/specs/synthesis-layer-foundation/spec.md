## ADDED Requirements

### Requirement: WebDAV durable import uses one Foundation transaction

WebDAV durable import SHALL apply validated canonical assets through one
Foundation transaction and SHALL emit one canonical-store-changed event only
after promotion succeeds.

#### Scenario: Valid import is promoted

- **WHEN** a WebDAV durable import passes validation, preview, and conflict gates
- **THEN** one Foundation transaction SHALL apply all imported canonical facts
- **AND** failed promotion SHALL roll back partial writes and emit no success
  receipt.

