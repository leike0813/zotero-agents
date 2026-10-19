## ADDED Requirements

### Requirement: Explicit maintenance SHALL consume complete Library snapshots

Explicit Reference refresh and retry SHALL capture and stage library.items.sync_snapshot through the existing snapshot index owner. The native maintenance route SHALL promote the opaque prepared generation only after successful Reference work and its final promotion checkpoint. Snapshot preparation SHALL serialize competing refreshes without exposing repository records or locks. Ordinary Library reads SHALL remain read-only.

#### Scenario: A complete nonempty snapshot reaches successful maintenance completion

- **WHEN** consecutive closed pages match the library/snapshot identity, cumulative counts and Host-issued completion digest
- **AND** Reference refresh succeeds and its final checkpoint permits promotion
- **THEN** the snapshot owner atomically promotes the captured membership
- **AND** the membership remains readable across reopen

#### Scenario: Snapshot or Reference work fails or is canceled

- **WHEN** capture, page decoding, completeness validation, Reference work or the final checkpoint fails
- **THEN** the prepared generation is discarded without replacing the current generation
- **AND** the existing maintenance failure or cancellation classification is preserved

#### Scenario: A complete empty snapshot reaches successful maintenance completion

- **WHEN** complete Host evidence proves zero members and Reference work succeeds
- **THEN** promotion atomically removes membership from the prior generation

#### Scenario: A Library Index read is requested

- **WHEN** an ordinary Library or planning read executes
- **THEN** it does not invoke snapshot synchronization or write snapshot generations

## MODIFIED Requirements

### Requirement: Reference Host page reads SHALL use a capability-specific deadline

`library.items.list_page` and `library.items.sync_snapshot` SHALL retain the general 1 MiB response-body bound and use a thirty-minute upper timeout bounded by the caller's remaining request or maintenance deadline. The Host endpoint and native client MUST enforce the same selected timeout. Other reverse-Host capabilities SHALL retain their existing capability policy.

#### Scenario: Reference Host page exceeds the general deadline

- **WHEN** a valid library page response completes after ten seconds and before the remaining maintenance deadline
- **THEN** the reverse-Host returns the complete bounded page

#### Scenario: The caller's deadline is shorter than the library upper timeout

- **WHEN** the remaining request budget expires before the library read completes
- **THEN** the read terminates within that caller budget
