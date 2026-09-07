## ADDED Requirements

### Requirement: Workbench uses independent Preact region composition

Workbench SHALL build its hosted page from a thin entry and TypeScript/TSX modules under `src/synthesis`, with stable containers, projections and independently memoized Preact regions. The complete Shell/Chrome, Home, Topics, Concepts, Graph, Registry, Tags, Review Center and Reader surfaces SHALL replace the monolithic page renderer.

#### Scenario: User opens a Workbench surface

- **WHEN** the user navigates to any of the seven tabs or Reader
- **THEN** its component SHALL expose the existing surface actions and content
- **AND** loading, empty and error states SHALL remain explicit rather than replacing the business implementation.

### Requirement: Workbench preserves portable message and refresh boundaries

Workbench SHALL consume shared portable snapshot, surface and message DTOs and use the shared action/payload mapping at transport boundaries. The migration SHALL preserve host message names, payload semantics and shell/chrome/surface refresh ownership.

#### Scenario: A hidden surface response arrives

- **WHEN** the host delivers data for a nonvisible surface
- **THEN** the page SHALL update that surface's owned state without repainting unrelated visible content.

#### Scenario: A stale response arrives

- **WHEN** a response belongs to an older accepted request or graph generation
- **THEN** it SHALL NOT replace the current newer owner state.

### Requirement: Graph retains its imperative surface and interaction channel

Graph SHALL own a persistent Sigma surface, vendor injection, camera and lifecycle cleanup. Matching graph/query-basis continuation pages SHALL merge by row identity; new owners SHALL replace their accumulated window. Hover/selection-only updates SHALL avoid topology reconstruction.

#### Scenario: Chrome or tab visibility changes after Graph mounts

- **WHEN** unrelated chrome changes or the graph is temporarily inactive
- **THEN** the mounted graph surface and camera SHALL remain available for return to that owner
- **AND** final disposal SHALL release graph-owned resources.

### Requirement: Reader and localization use shared bounded content rendering

Workbench SHALL resolve i18n message keys during projection/rendering and SHALL use the shared synthesis Markdown sanitize profile and topic timeline renderer. It SHALL preserve Reader sections, evidence exploration, report actions and digest loading/results without whole-DOM reverse translation.

#### Scenario: A report or digest updates

- **WHEN** the current Reader receives new report content or a digest result
- **THEN** its owned content region SHALL update using shared rendering rules
- **AND** unrelated page controls SHALL retain identity.

### Requirement: Hosted and offline Workbench builds have separate composition

Hosted Workbench, standalone topic export and deep-reading graph export SHALL use separate entries. Offline entries SHALL import only their required graph/reader modules and local interactions, preserve usable export layouts, and keep their consumer asset paths stable. Source and built-in graph templates SHALL be synchronized.

#### Scenario: An offline artifact loads without a host

- **WHEN** a topic export or embedded graph initializes from its supplied envelope
- **THEN** it SHALL render at the available content width using its export layout
- **AND** it SHALL NOT need the complete hosted renderer or a live host bridge.

### Requirement: Migration regression preserves surface parity and rendering evidence

Workbench migration SHALL retain the semantics of existing surface parity gates and diagnostic release-elision checks. Page regression SHALL exercise actual bootstrap, region identity, graph interactions and bounded lists; deleted-page source assertions SHALL be migrated without discarding applicable host semantics.

#### Scenario: Migration acceptance is evaluated

- **WHEN** build, type, component, browser and parity checks are recorded
- **THEN** each result SHALL distinguish passes, failures and unavailable runtime/fixture checks
- **AND** source or parity checks alone SHALL NOT substitute for interaction evidence.

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
