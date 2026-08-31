## ADDED Requirements

### Requirement: Diagnostics SHALL expose structured runtime admission failure

The debug lifecycle projection SHALL publish `runtime-admission` before reading
or classifying the first cutover receipt. Failure projection SHALL prefer a
structured `details.reason`, then a stable error code, and MUST NOT derive a
reason by tokenizing human-readable error text.

#### Scenario: Installed build differs from current admission
- **WHEN** startup detects a non-admitted build fingerprint
- **THEN** every diagnostic consumer reports `runtime-admission / runtime_mismatch`
- **AND** sanitized details include current and target fingerprints

#### Scenario: Error message begins with prose
- **WHEN** a runtime error contains whitespace-delimited explanatory text
- **THEN** diagnostic code selection does not emit the first message word
