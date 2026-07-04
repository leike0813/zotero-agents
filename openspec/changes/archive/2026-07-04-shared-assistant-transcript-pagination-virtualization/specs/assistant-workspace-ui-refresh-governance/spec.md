## MODIFIED Requirements

### Requirement: ACP Skills transcript SHALL be request-scoped

ACP Skills transcript rendering SHALL keep transcript render state scoped by
request id. Switching selected runs SHALL save the previous request's
transcript page/render state inside the shared transcript renderer and restore
the new request's cached state when available; otherwise the panel SHALL request
the new request's transcript page through the shared renderer. Building a panel
snapshot for a requested run SHALL NOT mutate the globally selected request;
global selection SHALL only change through explicit selection actions. Late
transcript page requests for a run that is no longer selected SHALL be ignored
instead of publishing a stale ACP Skills snapshot.

#### Scenario: Switching concurrent ACP Skills runs does not reuse transcript DOM

- **WHEN** multiple ACP Skills runs are active
- **AND** the user selects a different run while the host snapshot is still
  catching up
- **THEN** the ACP Skills panel keeps the pending request id separate from the
  previous selected run
- **AND** it does not render the previous run's transcript as the pending run
- **AND** it restores the pending request's cached transcript state when
  available
- **AND** it requests the pending request's transcript page when no cached state
  is available.

#### Scenario: Late old-run page request is ignored

- **GIVEN** the ACP Skills panel selected run changes from run A to run B
- **WHEN** a delayed transcript page request for run A reaches the host
- **THEN** the host SHALL NOT publish a forced ACP Skills snapshot for run A
- **AND** a page request for the currently selected run B SHALL still publish a
  snapshot.
