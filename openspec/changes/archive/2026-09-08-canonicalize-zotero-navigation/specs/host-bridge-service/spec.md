## ADDED Requirements

### Requirement: Host Bridge SHALL expose canonical navigation capabilities

The authenticated `/bridge/v2/call` dispatcher SHALL expose exactly the seven
navigation capability IDs `navigation.focus_zotero`,
`navigation.select_library_view`, `navigation.select_collection`,
`navigation.select_saved_search`, `navigation.reveal_items`,
`navigation.open_item`, and `navigation.open_reader_location`. It SHALL invoke
the canonical Broker with one captured main window and SHALL reject the removed
`/context/items/open`, `/context/notes/open`, `/context/collections/open`, and
`/context/selection/open` routes without fallback.

#### Scenario: Authenticated navigation call succeeds
- **WHEN** an authenticated caller submits valid canonical navigation input
- **THEN** the service validates the input, applies the caller scope, invokes the Broker, and returns the operation-specific result
- **AND** the response contains no native object, window ID, path, or full UI snapshot.

#### Scenario: Legacy navigation route is called
- **WHEN** a caller requests a removed context-open route
- **THEN** the service returns a structured unsupported or not-found error
- **AND** no legacy helper or direct Zotero API is invoked.

#### Scenario: Target window closes after admission
- **WHEN** the captured main window becomes invalid before the first UI effect
- **THEN** the call fails closed with a stable unavailable result
- **AND** it does not redirect to another window.
