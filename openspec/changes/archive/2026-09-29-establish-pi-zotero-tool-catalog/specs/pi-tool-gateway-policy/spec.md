# Spec Delta

## ADDED Requirements

### Requirement: Bounded executor failure facts survive Gateway projection
The Gateway SHALL retain a trusted executor's stable failure code, retryability, and strict-JSON details in its structured tool result when those facts are valid and bounded. It SHALL keep native exception text and failure payloads out of durable attempt receipts, and SHALL reject malformed or oversized failure details safely.

#### Scenario: Trusted structured failure
- **WHEN** an executor returns a bounded failure with code, retryability, and strict-JSON details
- **THEN** the Gateway result preserves those fields while its receipt contains no failure details

#### Scenario: Invalid failure details
- **WHEN** an executor returns non-JSON or oversized failure details
- **THEN** the Gateway exposes no untrusted details and reports a safe failure
