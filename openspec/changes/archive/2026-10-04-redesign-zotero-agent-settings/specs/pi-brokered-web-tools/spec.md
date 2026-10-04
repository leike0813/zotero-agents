## MODIFIED Requirements

### Requirement: Search sources are explicit and frozen

The system SHALL offer only curated Exa/Tavily/Brave MCP, direct Brave/SearXNG/Perplexity and OpenAI/Anthropic native sources. Only Exa SHALL default enabled. Saved order SHALL express fallback consent. A turn SHALL freeze enabled sources, configuration and credential identities/revisions. An enabled native source referencing the exact active model configuration SHALL move to the head for that turn only. Loading/saving SHALL remain offline; explicit testing SHALL operate on one complete saved source independently of enabled-chain admission.

#### Scenario: Same provider with a different account

- **WHEN** a source references a different model configuration from the active model
- **THEN** its saved priority remains unchanged

#### Scenario: Settings change during a turn

- **WHEN** saved source order changes
- **THEN** the active turn retains its original chain and later turns receive the new order

#### Scenario: Disabled source is tested

- **WHEN** an explicit test targets a complete saved disabled source
- **THEN** only that source executes under existing permission/credential policy without enabling it or selecting a fallback source

## ADDED Requirements

### Requirement: Search test evidence follows saved source identity

Explicit tests SHALL identify source/request/configuration/credential identity and require actual complete source search evidence. Tests SHALL NOT retry, change enablement/order, certify other sources, resume tasks or lift model subscription pause. Enablement/order-only edits SHALL preserve applicable evidence; endpoint, authentication or native model changes SHALL invalidate it. Applicable billing SHALL be disclosed before dispatch.

#### Scenario: Source configuration changes during a test

- **WHEN** the result arrives after its target/authentication/model identity changes
- **THEN** it cannot certify the new configuration or replace a newer request result

#### Scenario: Source only returns a connection success or partial response

- **WHEN** actual completed search evidence is absent
- **THEN** its test is not reported as completed even if transport succeeded
