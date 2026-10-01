## ADDED Requirements

### Requirement: Broker invocation association commits before effects
The Gateway SHALL bind original owner, turn and call identities to trusted Broker scope/operation identity in canonical started evidence before first effect. Reconciliation SHALL consume read-only Broker observation and append authoritative evidence to the original invocation without reissuing effects, reopening terminal turns or overwriting sealed/canceled owner results. Missing/expired evidence SHALL not imply no effect.

#### Scenario: Broker settles after logical cancellation
- **WHEN** authoritative evidence arrives for the original operation
- **THEN** it reconciles only that invocation and does not change the canceled turn or automatically continue the owner

### Requirement: Physical resource claims outlive logical timeout
Gateway/executors SHALL retain write-resource and live-execution claims until verified physical settlement. Physical release SHALL be distinct from outcome recovery and file-cleanup eligibility; per-tool teardown SHALL be bounded by thirty seconds and by the remaining plugin shutdown deadline.

#### Scenario: Logical result precedes process exit
- **WHEN** an executor returns an unknown timeout result while its child still runs
- **THEN** conflicting resource use and cleanup remain blocked until real exit evidence
