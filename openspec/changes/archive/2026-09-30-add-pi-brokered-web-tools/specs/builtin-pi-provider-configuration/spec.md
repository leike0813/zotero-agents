## ADDED Requirements

### Requirement: Web sources reference isolated credentials and official models

The system SHALL retain Web-only credentials in the encrypted web-source namespace. Grounded sources SHALL reference existing enabled compatible official model-provider configurations and freeze their credential identity. Custom endpoints SHALL NOT qualify. Loading and saving sources SHALL remain offline.

#### Scenario: Configuration is disabled
- **WHEN** a grounded source references a disabled configuration
- **THEN** it is unavailable and permitted fallback may continue
