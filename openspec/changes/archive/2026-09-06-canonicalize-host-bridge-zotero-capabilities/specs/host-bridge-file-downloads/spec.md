## ADDED Requirements

### Requirement: Mutation uploads SHALL become private prepared files

Host Bridge SHALL accept mutation upload input only through opaque registered handles and SHALL acquire the existing lease before trusted execution. The adapter SHALL validate and stage the input into a private prepared-file snapshot before Broker mutation effects. File handles, leases, prepared paths, and staging details SHALL not enter public mutation DTOs, approvals, receipts, attempts, errors, logs, or durable operation identity.

#### Scenario: Valid upload is prepared
- **WHEN** an authorized canonical mutation references a valid unexpired upload handle
- **THEN** Host Bridge SHALL acquire and validate the lease and pass only private prepared-file facts to trusted Broker execution
- **AND** the public result SHALL expose no source path or lease value.

#### Scenario: Prepared source changes
- **WHEN** the source no longer matches prepared identity, size, or SHA-256 facts at execution revalidation
- **THEN** the mutation SHALL fail before its Host effect
- **AND** it SHALL not silently substitute changed content.

## MODIFIED Requirements

### Requirement: Attachment locality SHALL project only the current Broker page

Attachment reads and canonical mutation attachment outputs SHALL apply the locality projection only to the current Broker page or bounded result. Each attachment SHALL omit host-local paths and expose only an opaque file descriptor when available or a structured unavailable state otherwise. File registration and transfer SHALL run outside native Host admission.

#### Scenario: Mutation returns an attachment
- **WHEN** a canonical mutation returns attachment facts
- **THEN** the same locality projection SHALL apply
- **AND** the result SHALL not contain a local path, prepared source, or upload lease.

#### Scenario: Attachment page has continuation
- **WHEN** a remote caller reads one attachment page
- **THEN** only that page receives opaque file descriptors or unavailable access
- **AND** no host-local path escapes.
