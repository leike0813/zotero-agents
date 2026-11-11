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
- **THEN** the matches SHALL be displayed with a separate animated counting status beside the pagination controls
- **AND** the total-page field SHALL retain its numeric value when known or a static unknown marker otherwise
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
- **THEN** accepted content and any valid known total SHALL remain visible and loading indicators SHALL stop
- **AND** counting failures SHALL be identifiable separately from an unknown total
- **AND** a changed basis SHALL require a refresh from the first page.

#### Scenario: A pagination action crosses the page boundary
- **WHEN** a valid first, previous, next, last or positive integer page action is dispatched
- **THEN** the page SHALL forward the existing action payload to the host
- **AND** malformed page numbers SHALL NOT be forwarded.

## ADDED Requirements

### Requirement: Index SHALL preserve a suspended live query across tab changes

Within one Workbench, an unchanged Index owner SHALL retain its current page, expansion, focus and scroll when another tab is selected. Enumeration SHALL pause after the in-flight batch and resume the same traversal on return. Closing the Workbench or replacing the query SHALL discard its live cursors.

#### Scenario: User leaves before counting completes
- **WHEN** the user leaves Index during a scan and returns without an owner invalidation
- **THEN** cached current-page content SHALL appear immediately without rereading accepted summaries
- **AND** no new batch SHALL start while Index is hidden
- **AND** enumeration SHALL continue from the next unconsumed batch on return.

#### Scenario: A hidden response belongs to a replaced owner
- **WHEN** a response arrives after its library, query, service or data revision was replaced
- **THEN** it SHALL NOT change the current owner's rows or counting state.

#### Scenario: Workbench is closed and reopened
- **WHEN** a valid session cache is available after closing and reopening Workbench
- **THEN** Index SHALL open on its cached first page
- **AND** an incomplete query SHALL begin a new enumeration without replaying a closed traversal's cursor.

### Requirement: Tag tables SHALL render bounded measured windows

Vocabulary and staged Tag tables SHALL mount only viewport rows, bounded overscan and a focused row. Business identity SHALL retain selection, editing and expansion while row height changes preserve the visible anchor. Scrolling SHALL remain local to the page.

#### Scenario: User scrolls a large Tag table
- **WHEN** either Tag table contains at least 1000 rows and the user scrolls to a distant row
- **THEN** mounted rows SHALL remain bounded independently of the total
- **AND** scrolling SHALL NOT dispatch host actions
- **AND** editing, expansion and select-all SHALL retain their existing filtered-set semantics.

### Requirement: Index rating fills SHALL share their outline geometry

Empty, whole and half-filled rating stars SHALL use one geometric outline independent of font glyph metrics while preserving score conversion, missing-rating appearance and accessible rating labels.

#### Scenario: A rating contains a half star
- **WHEN** a parent has a rating requiring a half star
- **THEN** the filled half SHALL align with its outline at supported display scaling.
