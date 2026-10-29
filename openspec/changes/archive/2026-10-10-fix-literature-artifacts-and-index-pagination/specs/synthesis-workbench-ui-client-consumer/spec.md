## MODIFIED Requirements

### Requirement: Index SHALL reuse bounded session data

Within one Zotero session, Index SHALL retain successful first-window summaries and details, bounded to four scope entries and 8 MiB. Reopening SHALL begin at the first window. Exhausted valid entries SHALL reopen without source rereads; entries needing continuation SHALL paint immediately and rebuild live traversal with fresh cursors. Data changes, explicit refresh and service identity changes SHALL invalidate reuse.

#### Scenario: Complete Index is reopened
- **WHEN** the same library and scope reopen with unchanged revision and service identity and the cached first window exhausts the source
- **THEN** successful rows and loaded details are reused without a new native Index read.

#### Scenario: A closed page receives invalidation
- **WHEN** library or Reference data changes while the page is closed
- **THEN** reopening refreshes the invalidated Index.

#### Scenario: A later window was displayed before closing
- **WHEN** Index is reopened
- **THEN** it SHALL show the first window and SHALL NOT reuse a retained pagination cursor.

#### Scenario: The cached first window has continuation
- **WHEN** that window is reopened
- **THEN** it SHALL paint cached content immediately and establish fresh cursor boundaries before continuation.
