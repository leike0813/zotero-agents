## ADDED Requirements

### Requirement: Generic SHALL expose direct research-bundle delivery as an independent lifecycle branch

The Generic coordinator SHALL distinguish workflow Product delivery, direct paper-bundle delivery, and direct Topic-bundle delivery. Stable direct scopes SHALL enter the Synthesis task without workflow submission; unresolved identities SHALL pass through Query first. Direct delivery SHALL use the shared Generic result contract and SHALL NOT be represented as a Product, Zotero attachment, or persisted Synthesis mutation.

#### Scenario: Local direct delivery completes
- **WHEN** Synthesis verifies the local bundle manifest, scope, file inventory, and warnings
- **THEN** the Generic result records completed local delivery evidence.

#### Scenario: Remote bundle is prepared but not downloaded
- **WHEN** Synthesis has a valid bridge-download descriptor but the caller has not retrieved the bytes
- **THEN** the result distinguishes prepared delivery from completed download
- **AND** it preserves the original typed Handle evidence.

#### Scenario: Remote bundle is downloaded
- **WHEN** the caller retrieves the archive and verifies its declared size and checksum
- **THEN** Generic may report completed downloaded delivery and the unpacked manifest evidence.

### Requirement: Generic direct-delivery recovery SHALL resume from missing evidence

Generic SHALL retain validated identities, warnings, and completed evidence and resume at bundle generation or byte download, whichever is the first unproven node. It SHALL NOT rerun earlier analysis, maintenance, or workflow stages merely because packaging, Handle expiry, or transfer failed.

#### Scenario: Remote Handle expires
- **WHEN** the source scope remains valid but its Handle expires
- **THEN** Synthesis requests a new direct bundle for the same scope and resumes download.

#### Scenario: User requests missing material to be produced
- **WHEN** the user explicitly asks to acquire or generate content missing from a direct bundle
- **THEN** Generic plans that state-changing or model-execution work as a separate authorized stage before a new direct-delivery request.
