## ADDED Requirements

### Requirement: Expanded Index rows SHALL participate in virtual scrolling

Parent and expanded reference rows SHALL use stable identities in one measured virtual window. Scrolling, incremental hydration, and appending batches SHALL preserve visible content, focused row identity, and the visible scroll anchor while keeping rendered row count bounded.

#### Scenario: Scroll through an expanded reference block
- **WHEN** a parent has more references than fit in the viewport
- **THEN** scrolling within that block continues to display its visible reference rows
- **AND** offscreen reference rows do not remain fully mounted

### Requirement: Index SHALL reuse bounded session data

Within one Zotero session, Index SHALL retain successful summaries and hydrated details across page closure, bounded to four scope entries and 8 MiB. Valid complete entries SHALL reopen without a source reread. Real data changes, explicit refresh, and service identity changes SHALL invalidate reuse; partial entries SHALL display immediately and rebuild with new cursors.

#### Scenario: Complete Index is reopened
- **WHEN** the same library and scope reopen with unchanged source revision and service identity
- **THEN** successful rows and loaded details are reused without a new native Index read

#### Scenario: A closed page receives invalidation
- **WHEN** library or Reference data changes while the page is closed
- **THEN** reopening refreshes the invalidated Index

### Requirement: Column repaint notifications SHALL preserve Index data

Custom-column notifications that only request repaint SHALL not invalidate Index data or invoke related-item echo reads. Real Zotero notifications SHALL retain their existing invalidation semantics. Related-item echo requests SHALL omit absent optional fields and receipts SHALL preserve the native consumed boolean.

#### Scenario: Custom column finishes loading
- **WHEN** it publishes a repaint-only item refresh
- **THEN** Index data stays valid and no echo RPC is dispatched

#### Scenario: Echo optional target is absent
- **WHEN** an ordinary item notification has no related-item target
- **THEN** its echo request remains valid JSON and reaches native dispatch
- **AND** a native false receipt remains false at the client boundary
