## ADDED Requirements

### Requirement: Sidecar runtime foundation remains isolated

Synthesis invariant guards SHALL keep the Node service foundation outside the
plugin runtime and outside all production data ownership paths.

#### Scenario: Boundary guard scans the service app

- **WHEN** invariant tests inspect the service application import graph and
  source
- **THEN** they SHALL reject plugin, Zotero, repository, canonical writer, Host
  effect, sync runtime, and compute-engine dependencies
- **AND** they SHALL require the production Synthesis client to remain
  in-process.

#### Scenario: Runtime foundation is added

- **WHEN** the isolated Node service foundation is present
- **THEN** the public service inventory SHALL remain `108 methods / 1 direct
  consumer`.
