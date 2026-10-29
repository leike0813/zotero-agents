## MODIFIED Requirements

### Requirement: Index SHALL expose current-window navigation and filtering

Index SHALL filter and search all parents in the selected library and scope before pagination. Bottom pagination SHALL use icon buttons for first, previous, next and last with an editable page number. Each page SHALL contain at most 100 matching library parents; reference children SHALL NOT consume parent slots. Accurate matching totals SHALL become available when the global query completes.

#### Scenario: User navigates with a local filter
- **WHEN** the user navigates with search or filters active
- **THEN** the filter SHALL be preserved and page boundaries and totals SHALL refer to the matching global parent set.

#### Scenario: Window navigation starts
- **WHEN** a page is requested
- **THEN** duplicate navigation SHALL be disabled during page loading
- **AND** successful navigation SHALL clear preceding expanded state and begin at the top
- **AND** unrelated regions SHALL preserve their DOM identity.

#### Scenario: Query is progressively counted
- **WHEN** initial matches are ready but global counting is unfinished
- **THEN** the matches SHALL be displayed with an animated loading total
- **AND** last-page and unknown-page navigation SHALL remain disabled until available.

#### Scenario: Page slices are loading
- **WHEN** the user reaches the end of loaded rows while the current page is unfinished
- **THEN** an animated loading indicator SHALL be visible there
- **AND** empty-result content SHALL appear only after the query establishes emptiness.

#### Scenario: References exceed the page size
- **WHEN** a parent on the current page has more than 100 references
- **THEN** every reference SHALL remain available through lazy loading
- **AND** the parent SHALL consume exactly one page slot.

#### Scenario: A query or page fails
- **WHEN** a background query or page read fails
- **THEN** accepted content SHALL remain visible and loading indicators SHALL stop
- **AND** a changed basis SHALL require a refresh from the first page.
