## ADDED Requirements

### Requirement: Native service cleanup SHALL drain every admitted owner

Native shutdown SHALL stop admission, cancel and settle transfer and compute,
drain every composed typed application, terminate the worker, close canonical
and repository owners, and remove matching lifecycle files with
failure-isolated cleanup.

#### Scenario: One native cleanup owner fails
- **WHEN** a cleanup step fails after shutdown begins
- **THEN** all later cleanup owners SHALL still be invoked
- **AND** the server and worker SHALL still be terminated within the bounded stop path
