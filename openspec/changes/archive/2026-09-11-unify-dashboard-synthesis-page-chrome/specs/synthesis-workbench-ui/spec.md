## ADDED Requirements

### Requirement: Workbench SHALL use the shared page-chrome layer

Synthesis Workbench SHALL take its control, text-scale, spacing and status-badge
tokens, and its panel header, back entry, empty-state and badge patterns, from
the shared page-chrome layer loaded by both page documents. It SHALL NOT keep a
Workbench-private duplicate of those tokens, and its status chips SHALL keep
their semantic variant colors in both themes.

#### Scenario: Workbench renders a status chip

- **WHEN** a Workbench surface renders a badge or status chip in light or dark
  theme
- **THEN** the chip SHALL use a shared semantic variant
- **AND** its colors SHALL NOT be hardcoded outside the shared token definitions.

#### Scenario: A shared token changes

- **WHEN** a control, text-scale, spacing or badge token changes in the shared
  page-chrome layer
- **THEN** Workbench controls and status chips SHALL pick up the change without
  editing a Workbench-private palette.

### Requirement: Workbench surfaces SHALL own one primary content scroll region

The Workbench page root and its main container SHALL NOT scroll. Every surface
SHALL fix its header, filter rows, summary bars and pagination zones outside
scrolling and SHALL expose one primary content scroll region for its primary
content: the Home surface uses the shared `.zs-scroll-region` utility, and a
surface's own table wrapper (such as the Concepts or Tags table wrap) MAY act
as that region under the same model. Secondary bounded sub-panels such as the
inline concept review panel (bounded to 42% of the surface height) or the tag
import popover (45%) MAY keep their own bounded scroll area, but they SHALL
NOT carry primary content, and the primary content SHALL be reachable through
the surface content region rather than a fixed-height nested box.

#### Scenario: Home surface is taller than the viewport

- **WHEN** the Home surface renders more sections than fit the available height
- **THEN** the page and main container SHALL NOT scroll
- **AND** the Home content SHALL scroll inside its own content region.

#### Scenario: Concepts table rows do not fill the grid

- **WHEN** the Concepts surface renders fewer or more rows than its grid tracks
  expect
- **THEN** the table wrapper SHALL size to the surface content region without
  clipping rows
- **AND** the table SHALL scroll as the surface content region, with the review
  panel remaining a bounded secondary area.

#### Scenario: Tags table has a sticky header

- **WHEN** the user scrolls the Tags table
- **THEN** its sticky header SHALL stay pinned inside the table's scroll
  container rather than scrolling out of view.

### Requirement: Workbench secondary views SHALL keep their originating context

Workbench secondary views SHALL render their back entry as the first element of
the shared panel header. While the Reader is open, the sidebar SHALL keep the
tab the Reader was opened from highlighted, and the back entry SHALL return to
that tab.

#### Scenario: User opens the Reader from a tab

- **WHEN** the user opens the Artifact Reader from a Workbench tab
- **THEN** the Reader's back entry SHALL be the first element of its panel
  header
- **AND** the sidebar SHALL keep the originating tab highlighted.

#### Scenario: User returns from a secondary view

- **WHEN** the user activates the back entry of Topic Details or the Artifact
  Reader
- **THEN** the Workbench SHALL return to the tab the view was opened from.

### Requirement: Workbench SHALL bound concept alias lists

The Concepts surface SHALL render at most three alias chips per row and SHALL
summarize further aliases in a single overflow chip that exposes the complete
hidden list.

#### Scenario: A concept has more than three aliases

- **WHEN** a concept row carries more than three aliases
- **THEN** the row SHALL render the first three aliases followed by one `+N`
  overflow chip
- **AND** the overflow chip SHALL expose every hidden alias on hover.

#### Scenario: A concept has three or fewer aliases

- **WHEN** a concept row carries three or fewer aliases
- **THEN** the row SHALL render them all
- **AND** no overflow chip SHALL be rendered.

#### Scenario: Concepts table keeps its layout

- **WHEN** alias chips are bounded
- **THEN** the alias column SHALL NOT grow the row height or push the row
  actions out of the table.
