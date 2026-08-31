## MODIFIED Requirements

### Requirement: Host Bridge uses cached client composition

Normal and debug Host Bridge calls SHALL use lazy cached default-client acquisition. They SHALL NOT use the Sync-specific fresh-client path, add service invalidation, or resolve a legacy service. Test injection SHALL resolve a client rather than a service.

#### Scenario: Default Host capability executes
- **WHEN** no test client resolver is configured
- **THEN** Host Bridge SHALL obtain the cached native production client
- **AND** unavailable native state SHALL fail closed without a legacy fallback

### Requirement: Complete-service access is confined to legacy composition

The retained legacy service MAY remain directly accessible only inside isolated oracle tests until R9b deletion. No production source SHALL resolve or import the complete legacy service; Host Bridge and MCP SHALL continue to use the grouped native `SynthesisClient`.

#### Scenario: Static boundary is inspected
- **WHEN** the service-boundary checker runs after cutover
- **THEN** the production direct-consumer count for the legacy service is zero
- **AND** isolated oracle fixtures are the only allowed legacy direct consumers

