# Spec Delta

## ADDED Requirements

### Requirement: Retrieval boundaries SHALL have bounded recursive contracts

Embedding, retrieval state, maintenance requests and private recommendation DTOs SHALL have matching concrete TypeScript and Rust wire validation, registered schemas and representative accepted/rejected corpus cases. Public searches SHALL retain their existing bounded envelope and portable identities. No DTO SHALL carry credentials, native paths or native IDs.

#### Scenario: Malformed vector crosses the boundary

- **WHEN** a payload contains mismatched identity, dimension, non-finite data, unsupported fields or an out-of-bound collection
- **THEN** validation rejects the payload before indexing or source effects
