## ADDED Requirements

### Requirement: Resident operations SHALL return stable receipts
Every non-silent Hermes resident-service operation SHALL return `zotero-librarian.operation-receipt.v1` with required `schema`, `operation`, `status`, and `generatedAt`. Status SHALL be `unchanged`, `changed`, `attention`, or `failed`; a failed receipt SHALL include a structured error and use a nonzero exit code.

#### Scenario: Unchanged cron operation is suppressible
- **WHEN** a cron invocation completes with status `unchanged` and quiet mode is enabled
- **THEN** the outer adapter emits `[SILENT]` while the internal operation still produces a valid receipt

#### Scenario: Resident failure is machine-readable
- **WHEN** a resident operation fails
- **THEN** stdout contains the receipt error shape and the process exits nonzero without free-form traceback output

### Requirement: Runner business results and resident receipts SHALL remain distinct
Generic Skill runner results SHALL use the task-result schema, while hosted service invocations SHALL use the operation-receipt schema. Neither contract SHALL masquerade as the other.

#### Scenario: Validator selects contract by boundary
- **WHEN** Host Bridge content validation checks Generic runners and Hermes service commands
- **THEN** each output is validated against its own boundary-specific schema

