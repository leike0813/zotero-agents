# Spec Delta

## Purpose

Provides read-only semantic evidence and verifiable source context for grounded answers over the published retrieval index.

## ADDED Requirements

### Requirement: Semantic search SHALL return scoped citable evidence

Search SHALL use exact published vectors, apply the intersection of requested and accessible scopes before scoring, and return verified excerpts with source kind, version, location and an evidence reference. Search SHALL default to papers and accept an explicit Topic target. Search SHALL distinguish partial coverage, empty results and semantic unavailability.

#### Scenario: The embedding service is unavailable

- **WHEN** no compatible published index and query service are usable
- **THEN** the result reports unavailability and the reason without issuing a lexical search or index maintenance.

#### Scenario: An indexed source changes

- **WHEN** a ranked source fails current identity, scope, range or version verification
- **THEN** other verified candidates can be returned with partial coverage, and the unverifiable excerpt is excluded.

### Requirement: Evidence context SHALL expand a verified same-source hit

The context reader SHALL check the evidence reference against current authorization, publication and version. It SHALL return the hit and at most one neighboring indexed fragment on either side of the same source in source order.

#### Scenario: The embedding service is offline after search

- **WHEN** the publication and source are still current
- **THEN** context expansion can return verified text without a new embedding call.

#### Scenario: A prior evidence reference becomes stale

- **WHEN** its publication or source changes, disappears or is suspended
- **THEN** context expansion returns a structured reason without substituting another source.
