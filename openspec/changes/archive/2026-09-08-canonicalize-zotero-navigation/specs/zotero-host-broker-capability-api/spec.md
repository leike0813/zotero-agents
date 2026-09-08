## MODIFIED Requirements

### Requirement: Navigation is separate from context queries

The broker SHALL expose `focusZotero`, `selectLibraryView`,
`selectCollection`, `selectSavedSearch`, `revealItems`, `openItem`, and
`openReaderLocation` as a separate navigation capability family. Inputs SHALL
use strict portable refs or the closed `ReaderLocation` union. Navigation SHALL
resolve and validate every target before changing UI state, and SHALL use the
trusted caller control to bind the effect to one captured Zotero window.

#### Scenario: Caller reads context
- **WHEN** a caller requests current view or selected items
- **THEN** no navigation or focus effect SHALL occur.

#### Scenario: Adapter invokes canonical navigation
- **WHEN** an authorized and exposed adapter invokes one of the seven operations
- **THEN** the broker SHALL return a JSON-safe operation-specific result
- **AND** interaction, caller-scope, and exposure policy SHALL remain owned by the adapter.

#### Scenario: Adapter invokes navigation
- **WHEN** an authorized and exposed adapter invokes a navigation operation
- **THEN** the broker SHALL return a JSON-safe navigation result
- **AND** interaction and exposure policy SHALL remain owned by the adapter.

#### Scenario: Target validation fails
- **WHEN** any requested ref, view, location, duplicate, library, or window target is invalid
- **THEN** the broker SHALL fail before the first UI effect
- **AND** it SHALL not fall back to another window, context route, or live selection.

### Requirement: Navigation SHALL return normalized target evidence

Navigation calls SHALL preserve portable identity and request order. Library
views SHALL use the closed supported set. `revealItems` SHALL accept 1–100
unique item, note, or attachment refs from one library and SHALL reject mixed
active/deleted targets. `openReaderLocation` SHALL support PDF page, annotation,
and EPUB CFI locations only when the captured window can accept the exact
location. Results SHALL contain only the minimal dispatch or selection evidence;
all navigation errors SHALL be non-retryable.

#### Scenario: Selection is revealed
- **WHEN** an interactive caller supplies a bounded ordered set of valid unique item references
- **THEN** the Host opens exactly those targets in the supplied order
- **AND** the result preserves the same normalized reference order.

#### Scenario: Selection is opened
- **WHEN** an interactive caller supplies a bounded ordered set of unique item references
- **THEN** the Host opens that selection and returns the same normalized reference order.

#### Scenario: Reader location is accepted
- **WHEN** the built-in Reader in the captured window initializes and accepts the normalized location
- **THEN** the broker returns `reader_location_dispatched` with the target and location.

#### Scenario: Exact Reader targeting is unavailable
- **WHEN** the native runtime cannot prove that the requested location belongs to the captured window
- **THEN** the broker returns `unsupported_operation` with `details.reason = location_unsupported`
- **AND** it does not open a location-free or different-window Reader.
