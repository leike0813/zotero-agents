## ADDED Requirements

### Requirement: SIWC failures expose only safe recovery evidence

SIWC failures SHALL use one project-owned classification and failure identity. Allowed evidence SHALL be limited to HTTP status, source category, recognized recovery cause, validated request ID and known unsupported parameter. Unknown errors SHALL remain unknown/non-retryable; bodies, headers, native exceptions, tokens and free-form provider detail SHALL not enter propagated failures.

#### Scenario: Unknown provider error

- **WHEN** an unrecognized private error body reaches the Provider boundary
- **THEN** the caller receives only a safe unknown failure without inferred retry or copied detail
