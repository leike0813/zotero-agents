## ADDED Requirements

### Requirement: Native lifecycle identity SHALL have cross-language parity

A versioned language-neutral corpus SHALL define valid and invalid manifest v2,
launch, discovery, health, handshake, capability, timestamp, target, signature,
and fingerprint documents for TypeScript and Rust rebuilders.

#### Scenario: Corpus is checked
- **WHEN** TypeScript and Rust process the same native lifecycle corpus
- **THEN** both SHALL accept the same valid documents and return the same stable code for every invalid document
