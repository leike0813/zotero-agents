## ADDED Requirements

### Requirement: Governed synthetic manifests SHALL materialize every sidecar locator

Every sidecar locator declared by a governed synthetic Topic manifest SHALL resolve to a request asset containing a JSON object with the declared media type before production-route sampling begins.

#### Scenario: Performance fixture is prepared
- **WHEN** the 2k, 10k, or 25k synthetic Topic request is built
- **THEN** every manifest sidecar path names an included JSON object asset
- **AND** the strict production parser accepts setup without an unmaterialized-locator fallback
