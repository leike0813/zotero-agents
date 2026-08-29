## ADDED Requirements

### Requirement: Production compute validates authenticated runtime identity
The internal production compute client SHALL bind every call to the discovered
profile and service instance, generate a unique request ID, and strictly rebuild
the returned engine result.

#### Scenario: Response identity matches
- **WHEN** an authenticated compute response echoes the request ID and expected service instance
- **THEN** the client rebuilds and returns the strict layout result

#### Scenario: Response identity or result is invalid
- **WHEN** the request ID, service instance, or strict result does not match the call
- **THEN** the client rejects the response with a stable internal error and exposes no credential data

