## ADDED Requirements

### Requirement: Content mirror synchronization SHALL support content-only scope

The synchronization command SHALL support a content-only scope that copies the selected published GitHub content release without synchronizing plugin refs, XPI assets or plugin update metadata.

#### Scenario: Content-only synchronization is requested
- **WHEN** the maintainer selects content-only and version 0.8.8
- **THEN** only the corresponding content release and content-feed mirror SHALL be synchronized.

### Requirement: Mirror assets SHALL follow published channel inventory

The mirror synchronizer SHALL validate complete ZIP/checksum pairs for the channels actually present in the selected GitHub release, copy immutable source bytes and verify mirror bytes. It SHALL advance the feed only after successful asset verification.

#### Scenario: Only dev was published
- **WHEN** the source release contains only dev ZIP and checksum
- **THEN** synchronization SHALL accept that complete pair without requiring stable or beta.

#### Scenario: A published asset pair is incomplete
- **WHEN** a ZIP or matching checksum is absent or the checksum disagrees
- **THEN** synchronization SHALL fail before uploading assets or advancing the feed.

#### Scenario: Existing mirror asset matches or conflicts
- **WHEN** the mirror has a same-name asset
- **THEN** identical bytes SHALL be reused and different bytes SHALL fail without replacement.

#### Scenario: Feed or tag cannot be synchronized safely
- **WHEN** the mirror feed cannot fast-forward or a same-name tag identifies a different commit
- **THEN** synchronization SHALL fail without force-pushing refs.

#### Scenario: Mirror synchronization completes
- **WHEN** all source assets have been mirrored
- **THEN** public download URLs, sizes, hashes and checksum assets SHALL match the source feed and the mirrored content-feed ref SHALL match the captured GitHub ref.
