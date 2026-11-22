## MODIFIED Requirements

### Requirement: Migration guidance SHALL keep navigation and decisions accessible

The wizard SHALL show numbered steps and one fixed action bar directly below them, above the filters and scrolling content. Overview, problem review, and final review SHALL use the same bar for their primary and backward actions. Shared choices SHALL state their whole-scan scope and identify individual exceptions. Long titles and supporting text SHALL remain bounded and inspectable, with data-discard and replacement consequences visible.

#### Scenario: A user moves between problem review and final review
- **WHEN** the user advances through problem groups and returns from final review
- **THEN** the previous-step action SHALL return to the prior problem group or overview and restore the previously reviewed group when returning from final review
- **AND** a preview without problem groups SHALL proceed directly to final review
- **AND** the final write action SHALL be in the same bar as the preceding primary actions and SHALL require the existing explicit confirmation.

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

#### Scenario: A user keeps document details open while navigating
- **WHEN** the narrow detail view is open
- **THEN** the same top action bar SHALL remain available
- **AND** moving to another wizard step or problem group SHALL close the previous detail so the new step is visible.
