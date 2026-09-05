## ADDED Requirements

### Requirement: Workbench updates preserve unrelated interaction regions
Workbench SHALL preserve unrelated controls, focus and graph camera when receiving surface or chrome updates. Matching graph continuation pages SHALL accumulate without dropping earlier accepted pages. Stale responses SHALL NOT replace a newer owner or generation.

#### Scenario: Graph continuation arrives during interaction
- **WHEN** multiple current-generation graph pages arrive while a node is hovered
- **THEN** all accepted graph rows remain available and the camera and hover remain stable
- **AND** unrelated chrome controls retain their DOM identity.

### Requirement: Large topic and index lists have bounded rendered windows
Topics and Index SHALL keep mounted rows proportional to the viewport and bounded overscan, while preserving selection by business identity and keyboard focus.

#### Scenario: User scrolls through a large collection
- **WHEN** the user scrolls from the beginning to distant rows
- **THEN** rows outside the rendered window leave the DOM
- **AND** selected items remain selected and filtering operates on the full supplied collection.

### Requirement: Offline exports retain independent interaction
Standalone graph and topic exports SHALL render their supplied envelopes without requiring a live host and SHALL preserve local graph, reader and navigation interactions.

#### Scenario: Export opens without Zotero
- **WHEN** a user opens an exported topic or embedded graph with no host bridge
- **THEN** its local navigation, graph selection and report content remain usable
- **AND** local interactions do not attempt host maintenance.
