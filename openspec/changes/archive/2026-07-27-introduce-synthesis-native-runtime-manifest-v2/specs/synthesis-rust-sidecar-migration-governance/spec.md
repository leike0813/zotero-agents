## ADDED Requirements

### Requirement: R8 acceptance SHALL stop before production cutover

R8 SHALL require native manifest, installation, lifecycle, worker, isolated
integration, workflow, provenance, and package-budget evidence while retaining
the existing production owner.

#### Scenario: Local implementation is complete without remote evidence
- **WHEN** all local Linux and static workflow gates pass but the five-platform workflow has not been dispatched
- **THEN** the change SHALL remain active and SHALL NOT claim five-platform acceptance or archive
