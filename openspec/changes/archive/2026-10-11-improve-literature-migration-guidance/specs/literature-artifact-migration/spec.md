# Spec Delta

## MODIFIED Requirements

### Requirement: Migration review SHALL operate on the complete bounded plan

The Dashboard SHALL filter the complete process-local preview before paging and SHALL expose at most 25 summaries at once. A selected summary SHALL open a bounded detail drawer containing safe counts, diagnostics, concrete issues, applicable runtime-issued options, and the candidate disposition without parent refs or payload content.

#### Scenario: A user filters and opens a migration candidate
- **WHEN** the user filters by text, classification, reason, or disposition and opens one result
- **THEN** counts and paging SHALL describe the complete filtered preview
- **AND** the detail drawer SHALL expose only bounded review facts and runtime-issued option identities.

#### Scenario: A user reviews more than 25 affected references
- **WHEN** the user expands an issue with more than 25 affected references
- **THEN** the Dashboard SHALL offer pages of at most 25 items from that issue's original scan conversion with accurate totals
- **AND** the runtime SHALL validate the scan operation, candidate, and issue identities before returning a page
- **AND** selected processing choices SHALL NOT replace the original review evidence
- **AND** reading pages SHALL NOT scan or modify library data or migration choices
- **AND** an expired preview SHALL report unavailable review evidence.

## ADDED Requirements

### Requirement: Migration guidance SHALL keep navigation and decisions accessible

The review wizard SHALL show numbered steps and one fixed navigation footer
outside the scrolling content. Shared choices SHALL precede the affected
document list, state their whole-scan scope, and identify individual exceptions.
Long titles and supporting text SHALL remain bounded with a way to inspect the
available text, while data-discard and replacement consequences remain visible.

#### Scenario: A user moves between problem review and final review
- **WHEN** the user advances through problem groups and returns from final review
- **THEN** navigation SHALL name its destination and restore the previously reviewed group
- **AND** a preview without problem groups SHALL proceed directly to final review
- **AND** the final write command SHALL remain in the fixed footer and require the existing explicit confirmation.

#### Scenario: A user pages or filters documents
- **WHEN** the user changes a page or filter
- **THEN** choices and inclusion decisions SHALL remain unchanged
- **AND** entering a multi-digit page number SHALL wait for Enter or focus departure before navigating
- **AND** document paging SHALL return the list to its start without closing the selected document details
- **AND** an empty filtered list SHALL retain problem choices and wizard navigation.

#### Scenario: A user reviews long content in a narrow window
- **WHEN** titles, hints, or expanded details exceed the available width
- **THEN** the content SHALL wrap or expose a bounded summary without horizontal page overflow
- **AND** navigation and pagination SHALL remain reachable independently of document scrolling
- **AND** the narrow detail view SHALL provide a return action to the document list.
