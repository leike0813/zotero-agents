# Spec Delta

## ADDED Requirements

### Requirement: Retrieval maintenance SHALL reuse durable public operation ownership

Explicit retrieval build, rebuild, update and cleanup SHALL use existing public maintenance admission, cancel, retry, continue and restart classification. Only durable winners SHALL execute work. Retry SHALL create a successor; continue SHALL preserve continuation-required identity. Completed compatible staging SHALL be reusable without automatic restart dispatch.

#### Scenario: Maintenance admission is repeated

- **WHEN** identical concurrent submissions or retry keys are admitted
- **THEN** only the durable winner performs encoding or publication and all others observe its operation

#### Scenario: Process restarts during retrieval maintenance

- **WHEN** pending or running work is reconciled at startup
- **THEN** existing continuation-required or external-effect-unknown classification applies and no work automatically resumes

### Requirement: Post-publication work SHALL NOT revoke successful retrieval

Successful index publication SHALL remain successful if old-data cleanup or subsequent Discovery fails. Cleanup and candidate generation SHALL have separately observable issues and explicit recovery; cleanup recovery SHALL not rebuild and candidate recovery SHALL not re-encode.

#### Scenario: Cleanup fails after publication

- **WHEN** the new compatible index is published but old-data removal fails
- **THEN** semantic queries continue against the new index and maintenance records a cleanup issue for explicit recovery
