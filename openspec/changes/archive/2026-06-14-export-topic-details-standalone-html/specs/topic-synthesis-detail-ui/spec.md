## ADDED Requirements

### Requirement: Topic Details standalone HTML export

The Topic Details surface SHALL provide a localized export action that creates a
self-contained `.html` representation of the currently opened topic.

#### Scenario: Export replaces copy summary

- **GIVEN** a topic is open in Topic Details
- **WHEN** the toolbar is rendered
- **THEN** the legacy `Copy Summary` action is not shown
- **AND** a localized `Export Topic HTML` action is shown
- **AND** activating it sends an `exportTopicDetailHtml` host command with the current topic id

#### Scenario: Export keeps generated and user content unchanged

- **GIVEN** the exported topic contains report text, topic content, paper titles, and digest markdown
- **WHEN** the standalone HTML is generated
- **THEN** those generated or user-provided content fields are embedded unchanged
- **AND** only fixed UI labels are localized through Synthesis message keys

#### Scenario: Standalone export renders only Topic Details chrome

- **GIVEN** a user opens the generated standalone HTML
- **WHEN** the Topic Details surface is rendered
- **THEN** the Workbench sidebar, status bar, and other Workbench pages are not shown
- **AND** host-only Topic Details toolbar actions such as refresh, back to topics, and export HTML are not shown
- **AND** the topic citation graph is available as a Topic Details tab alongside Overview and Report

#### Scenario: Export copies the fixed topic-level HTML asset

- **GIVEN** a topic is open in Topic Details
- **WHEN** the user activates `Export Topic HTML` and chooses a save path
- **THEN** the Workbench uses the fixed standalone HTML asset under the topic's current persistent directory as the export source
- **AND** the user-selected path is only the copy destination
- **AND** the Workbench does not rebuild the standalone HTML when the fixed asset exists and matches the current topic signature

#### Scenario: Missing or stale fixed HTML asset is rebuilt before export

- **GIVEN** the fixed standalone HTML asset is missing or its metadata no longer matches the current topic signature
- **WHEN** the user activates `Export Topic HTML` and chooses a save path
- **THEN** the Workbench rebuilds the fixed topic-level HTML asset first
- **AND** it updates the fixed asset metadata
- **AND** it then copies the fixed asset to the user-selected path
- **AND** the export operation remains keyed by topic id so the toolbar button and status bar both show the pending state while building or copying
