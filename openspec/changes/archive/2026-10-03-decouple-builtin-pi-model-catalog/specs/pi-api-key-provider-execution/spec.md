## ADDED Requirements

### Requirement: Frozen metadata governs the actual provider request
The Provider SHALL map only understood frozen compat, reasoning mappings, defaults and applicable limits into its request. Known serialized byte and image-count bounds SHALL be enforced before transport. Remote data SHALL NOT provide arbitrary headers, credentials, routing privileges or new adapters. Custom and subscription targets SHALL NOT inherit public API pricing or capabilities merely from model identity.

#### Scenario: Serialized request exceeds a frozen bound
- **WHEN** the actual prepared request exceeds a known byte or image limit
- **THEN** no request is dispatched and a safe structured failure is returned

### Requirement: Usage and estimates retain actual invocation facts
Provider usage SHALL retain obtained token-category facts. Estimated costs SHALL use frozen applicable per-million rates and tiers with one calculation version. Missing price or required usage SHALL remain unknown; explicit zero rates SHALL permit zero estimates. Subscription usage SHALL NOT be priced using public API rates.

#### Scenario: Price changes after completion
- **WHEN** the directory publishes a new rate after a completed invocation
- **THEN** its persisted estimate remains based on the original selection and the new rate applies only to later selections
