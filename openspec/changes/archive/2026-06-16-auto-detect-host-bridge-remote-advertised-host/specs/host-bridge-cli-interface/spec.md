## MODIFIED Requirements

### Requirement: Remote SkillRunner Host Bridge endpoint resolution

The Host Bridge CLI interface SHALL provide a concrete remote Host Bridge
endpoint through environment variables when a SkillRunner backend is remote and
Host Bridge access is required.

#### Scenario: Manual advertised host override

- **GIVEN** `hostBridgeAdvertisedHost` is set to a concrete non-loopback host
- **WHEN** a remote SkillRunner request needs Host Bridge access
- **THEN** the injected endpoint uses that manual host and the pinned Host Bridge
  port.

#### Scenario: Auto-detected advertised host

- **GIVEN** `hostBridgeAdvertisedHost` is empty
- **AND** the SkillRunner backend URL uses a remote IPv4 literal host
- **WHEN** the local route detector finds a valid outbound local IPv4 address
- **THEN** the injected endpoint uses the detected host and the pinned Host
  Bridge port.

#### Scenario: Detection failure

- **GIVEN** no manual advertised host is configured
- **AND** automatic detection cannot produce a valid local IPv4 host
- **WHEN** a remote SkillRunner request needs Host Bridge access
- **THEN** workflow preparation fails before submitting the task
- **AND** diagnostics explain why no concrete advertised host was available.
