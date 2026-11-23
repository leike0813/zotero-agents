# Spec Delta

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

#### Scenario: Index opens while a read is slow

- **WHEN** the user opens Index and the first native scan has yet to return
- **THEN** Index SHALL show a loading state
- **AND** once matching source references are available, Index SHALL display the first batch of summaries while global matching continues.

#### Scenario: The query changes during an in-flight read

- **WHEN** the user changes the effective Index query while a read is in flight
- **THEN** the replacement query SHALL be able to start before the older read finishes
- **AND** older results SHALL NOT replace the replacement query's results.

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

#### Scenario: Background progress is written during an Index read

- **WHEN** an Index continuation overlaps a commit that only updates operation progress or retrieval state
- **THEN** the Index basis SHALL remain valid.

#### Scenario: A Reference change invalidates an Index continuation

- **WHEN** a commit changes Reference facts covered by the basis of an in-flight read
- **THEN** the continuation SHALL fail with a basis mismatch
- **AND** any accepted rows SHALL remain available for review until retry.

#### Scenario: A query or page fails

- **WHEN** a background query or page read fails
- **THEN** accepted content and any valid known total SHALL remain visible and loading indicators SHALL stop
- **AND** counting failures SHALL be identifiable separately from an unknown total
- **AND** Index SHALL offer a retry from the first page, including after a changed basis.

#### Scenario: A pagination action crosses the page boundary

- **WHEN** a valid first, previous, next, last or positive integer page action is dispatched
- **THEN** the page SHALL forward the existing action payload to the host
- **AND** malformed page numbers SHALL NOT be forwarded.
