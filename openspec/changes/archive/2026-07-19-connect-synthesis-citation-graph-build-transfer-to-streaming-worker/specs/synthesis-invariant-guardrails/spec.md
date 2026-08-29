## ADDED Requirements

### Requirement: Streaming canary preserves Synthesis ownership and inventory
The change SHALL preserve `mutationEnabled: false`, eight engine inventory entries, `108 methods / 1 direct consumer`, plugin ownership of DB/canonical/Host/basis/promotion state, and the worker import denylist.

#### Scenario: Governance checks run
- **WHEN** service boundaries and migration inventory are validated
- **THEN** only approved pool/worker modules SHALL import worker threads and no production owner or public client route SHALL move to the service
