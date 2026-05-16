## ADDED Requirements

### Requirement: Synthesis Workbench exposes artifact lifecycle controls

The Synthesis Workbench SHALL let users soft delete active topic synthesis
artifacts and purge previously deleted topic artifacts through host-owned
commands.

#### Scenario: User deletes an active artifact

- **WHEN** the user clicks Delete for an artifact row and confirms
- **THEN** the web panel SHALL send a host command for that topic
- **AND** the host SHALL call the Synthesis service delete operation
- **AND** the refreshed snapshot SHALL no longer show the topic in active
  artifacts.

#### Scenario: User purges deleted artifacts

- **WHEN** deleted artifacts exist and the user confirms Purge Deleted
- **THEN** the web panel SHALL send a host command
- **AND** the host SHALL call the Synthesis service purge operation
- **AND** the refreshed snapshot SHALL show no pending deleted artifacts.

#### Scenario: User cancels a lifecycle confirmation

- **WHEN** the user cancels Delete or Purge confirmation
- **THEN** the host SHALL NOT call the Synthesis service mutation.
