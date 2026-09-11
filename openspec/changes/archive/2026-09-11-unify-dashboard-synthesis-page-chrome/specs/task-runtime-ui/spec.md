## MODIFIED Requirements

### Requirement: Dashboard SHALL use the shared visual theme

The Task Dashboard SHALL use the shared Zotero Skills visual theme foundation
for shell, sidebar, cards, tables, forms, workflow settings, and custom select
controls. Control, text-scale, spacing and status-badge tokens SHALL come from
the shared page-chrome layer loaded by both page documents, and the Dashboard
SHALL NOT keep a page-private duplicate of those tokens.

#### Scenario: Dashboard renders in dark mode

- **WHEN** the selected visual theme is dark
- **THEN** Dashboard shell, sidebar, cards, tables, controls, status chips, and
  settings dialogs SHALL remain readable
- **AND** Dashboard CSS SHALL NOT depend on a separate independent palette for
  core surfaces.

#### Scenario: A shared token changes

- **WHEN** a control, text-scale, spacing or badge token changes in the shared
  page-chrome layer
- **THEN** Dashboard controls and status chips SHALL pick up the change without
  editing a Dashboard-private palette
- **AND** status chips SHALL keep their semantic variant colors in both light
  and dark themes.

## ADDED Requirements

### Requirement: Dashboard panels SHALL own one primary content scroll region

The Dashboard page root and its main container SHALL NOT scroll. Every panel
SHALL fix its header, toolbars, filter rows, summary blocks and pagination
zones outside scrolling and SHALL expose one primary content scroll region for
its primary content, named with the shared `.zs-scroll-region` utility. A
table that is itself a panel's content scroll container MAY keep its own
bounded height (the shared `.table-wrap` 320 px cap applies only to those
wrappers); a table inside a panel content scroll region SHALL be flattened
(`max-height: none`) so its sticky header sticks to that region instead of
creating a second scroll container.

#### Scenario: Home summary and running tasks are rendered

- **WHEN** the Home panel renders its workflow digest, summary counts and
  running-task table
- **THEN** the page and main container SHALL NOT scroll
- **AND** the running-task table SHALL scroll with the Home content region
  rather than inside a second, fixed-height scroll box
- **AND** only one scrollbar SHALL be present in that panel.

#### Scenario: A panel content is taller than the viewport

- **WHEN** a workflow options form, backend task list, Sidecar trace list, ACP
  trace replay or migrations candidate list has more content than the available
  height
- **THEN** the panel's own content region SHALL scroll
- **AND** the panel header, toolbar, filter and pagination zones SHALL remain
  fixed and visible.

#### Scenario: A table has a sticky header

- **WHEN** the user scrolls a Dashboard table whose header is sticky and that
  table sits inside a panel content region
- **THEN** the sticky header SHALL stay pinned within that region
- **AND** the table SHALL NOT scroll in a nested container.

### Requirement: Dashboard secondary views SHALL expose the back entry first

The Dashboard workflow documentation subview SHALL render its back entry as the
first element of the shared panel header and SHALL NOT duplicate it as a footer
action.

#### Scenario: User opens a workflow document

- **WHEN** the user opens a workflow README from the Home panel
- **THEN** the documentation view SHALL render a back entry as the first
  element of its panel header
- **AND** no separate back or return control SHALL be rendered in the view
  footer.

#### Scenario: User returns from a workflow document

- **WHEN** the user activates the back entry
- **THEN** the Dashboard SHALL return to the originating Home panel state.

### Requirement: Migrations region SHALL present unified panel chrome

The Migrations region SHALL render through the shared panel header, button,
text-input, badge and progress patterns. Its candidate list SHALL be the
region's single scroll region with the pagination zone fixed at the bottom, and
progress, summary counts and classification SHALL use semantic badge variants.

#### Scenario: A migration run is active

- **WHEN** a migration scan or apply reports progress and summary counts
- **THEN** the region SHALL show a determinate progress bar, or an indeterminate
  one when the total is unknown
- **AND** verified, unresolved, skipped and attention counts SHALL render as
  semantic badges rather than ad-hoc colored text.

#### Scenario: The migration region has candidates

- **WHEN** the candidate list exceeds the available height
- **THEN** the candidate list SHALL scroll within the region's single scroll
  region
- **AND** the panel header, toolbar and pagination zone SHALL remain fixed
- **AND** the region content SHALL NOT be clipped by the panel root.
