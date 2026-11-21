# Spec Delta

## ADDED Requirements

### Requirement: Retrieval build work SHALL outlive the request deadline

Accepted retrieval build, rebuild and update work SHALL run without a whole-operation timeout. Source reads and encoding batches SHALL retain independent bounds. The host SHALL distinguish request, source and encoding timeout evidence. Post-publication work SHALL have its own budget and cannot revoke successful publication.

#### Scenario: Healthy work crosses the old deadline

- **WHEN** bounded steps continue beyond 30 minutes
- **THEN** the same receipt remains active until completion or cancellation, and replay does not re-encode valid completed sources.

#### Scenario: Another retrieval action is submitted

- **WHEN** another retrieval maintenance operation already owns the data root
- **THEN** the same admitted identity returns the existing receipt and distinct work cannot run concurrently.

#### Scenario: Workbench reopens

- **WHEN** a Workbench opens after the original command returns or the previous view closes
- **THEN** it obtains the current or latest persisted retrieval receipt and can observe progress or invoke the existing recovery controls.
