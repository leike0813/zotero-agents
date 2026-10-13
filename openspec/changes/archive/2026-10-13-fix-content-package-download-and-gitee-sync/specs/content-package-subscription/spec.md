## REMOVED Requirements

### Requirement: Official content SHALL install from subscription feeds

**Reason:** Replace eager primary/mirror comparison with authoritative primary selection and bounded fallback.
**Migration:** Use the replacement subscription resolution requirement below; existing feed and install schemas remain unchanged.

## ADDED Requirements

### Requirement: Official content SHALL resolve authoritative subscription feeds

The plugin SHALL treat official workflows and plugin-side skills as installable content package artifacts fetched from a content feed rather than as XPI-bundled runtime content.

#### Scenario: Stable feed is the default user source
- **WHEN** the plugin resolves the default content feed
- **THEN** it SHALL use the stable channel and read GitHub before trying Gitee.

#### Scenario: Users can switch visible subscription channels
- **WHEN** the preferences UI displays official Workflow package controls
- **THEN** it SHALL allow stable or beta and expose dev only in debug mode.

#### Scenario: Dev channel falls back outside debug mode
- **WHEN** dev is configured and debug mode is disabled
- **THEN** the effective channel SHALL be stable.

#### Scenario: Feed branch remains lightweight
- **WHEN** official Workflow packages are published
- **THEN** ZIP artifacts SHALL be release assets and content-feed SHALL contain metadata rather than long-lived ZIP blobs.

#### Scenario: Primary feed succeeds without waiting for the mirror
- **WHEN** the primary feed is valid
- **THEN** the plugin SHALL use that feed immediately without requesting the mirror feed.

#### Scenario: Primary feed is unavailable
- **WHEN** the primary feed fails or times out
- **THEN** the plugin SHALL attempt the mirror and preserve primary failure diagnostics.

#### Scenario: Feed mirror asset URLs may differ
- **WHEN** the selected feed declares mirrors with different asset URLs
- **THEN** identical size and digest SHALL remain the package identity required of every downloaded candidate.

## MODIFIED Requirements

### Requirement: Official content installation SHALL expose shared progress

Official Workflow package installation SHALL expose a shared progress snapshot with coarse stages and byte progress during downloads for all install UI surfaces.

#### Scenario: Installer reports coarse stages
- **WHEN** official content installation runs
- **THEN** it SHALL report feed checking, download, verification, extraction, staging, promotion, state writing, registry refresh and completion with stable stage id, current step, total step count, percent and fallback label.

#### Scenario: Preferences reuses the shared progress
- **WHEN** Preferences is open during installation
- **THEN** it SHALL show the shared progress snapshot and hide the progress row when no install is active.

#### Scenario: Download reports bytes and attempts
- **WHEN** package bytes arrive
- **THEN** progress SHALL report received bytes, expected total bytes and the active attempt index/count and advance within the download stage.
- **AND** switching source SHALL reset that attempt's byte count; full download SHALL not mean installation has completed.

#### Scenario: Completion semantics remain unchanged
- **WHEN** installation succeeds or fails
- **THEN** the installed package state schema SHALL remain unchanged and final success/failure user feedback SHALL remain available.

## ADDED Requirements

### Requirement: Content requests SHALL have bounded fallback

Feed reads SHALL have a 15-second total deadline. Each ZIP candidate SHALL have a 15-second header deadline, 30-second inactivity deadline and 120-second total deadline. Timeout SHALL stop the attempt and permit sequential fallback.

#### Scenario: Headers or body stall
- **WHEN** headers do not arrive or the body stops delivering bytes within the applicable deadline
- **THEN** the request SHALL be aborted, waiting SHALL settle and the next candidate SHALL be attempted.

#### Scenario: Continuous slow transfer exceeds the total deadline
- **WHEN** bytes continue arriving but the attempt exceeds 120 seconds
- **THEN** the plugin SHALL abort that attempt and try the next source.

#### Scenario: Explicit release assets are selected
- **WHEN** the feed declares explicit download URLs
- **THEN** the installer SHALL try those URLs once each and SHALL NOT append feed-relative ZIP URLs.

#### Scenario: Relative-only feed is selected
- **WHEN** the feed provides only a relative artifact path
- **THEN** the installer SHALL resolve it against configured feed roots and verify every candidate against the selected feed.

### Requirement: Download failures SHALL remain observable

The installer SHALL preserve structured per-source download failures and previous installed content. UI terminal feedback SHALL survive late status refreshes and restore usable controls.

#### Scenario: All candidates fail
- **WHEN** every download candidate fails
- **THEN** the result SHALL identify each attempted source and its error category, including HTTP status when available, and retain the previous installation.

#### Scenario: Status refresh resolves after failure
- **WHEN** a failed installation is followed by an older asynchronous status response
- **THEN** the failure feedback SHALL remain visible and checks/retry controls SHALL recover.

#### Scenario: UI install action throws
- **WHEN** installation unexpectedly rejects
- **THEN** the UI SHALL show failure feedback and release its busy state.
