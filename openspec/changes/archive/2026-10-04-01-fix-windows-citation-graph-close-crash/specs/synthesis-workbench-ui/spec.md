# Spec Delta

## ADDED Requirements

### Requirement: Windows hosted graph resources retain their executable module lifetime

Before a hosted Synthesis document can create graphics resources in Windows Zotero, the host SHALL ensure the D3D11 code image remains resident until process termination. That lifetime SHALL survive disposal of tabs, windows and plugin JavaScript owners, while temporary resources acquired solely to establish the protection SHALL be released.

#### Scenario: A Windows Synthesis document is opened

- **WHEN** Windows Zotero opens an embedded Synthesis document or a dedicated Synthesis tab
- **THEN** the native module lifetime protection SHALL succeed before that document can create graph graphics resources
- **AND** D3D11 SHALL remain resident while later native graphics destruction returns through its code.

#### Scenario: The plugin JavaScript owner is disposed

- **GIVEN** the process has successfully established D3D11 lifetime protection
- **WHEN** a tab, window or plugin JavaScript owner is disposed while Zotero continues running
- **THEN** the protected code image SHALL remain resident until process termination
- **AND** graph-owned GPU and document resources SHALL still follow their normal disposal lifecycle.

#### Scenario: Synthesis documents are opened repeatedly

- **WHEN** the same process opens and disposes multiple Synthesis documents
- **THEN** every document SHALL receive the same process lifetime guarantee
- **AND** each protection attempt SHALL release its temporary acquisition resources.

#### Scenario: Native protection initialization fails

- **WHEN** native lifetime protection cannot be established
- **THEN** the host SHALL fail document creation and release resources acquired for that attempt
- **AND** existing embedded content SHALL remain intact
- **AND** a dedicated-tab opening SHALL NOT leave an empty tab
- **AND** a later opening SHALL be able to retry initialization.

#### Scenario: Synthesis is opened on another platform

- **WHEN** the host platform is not Windows
- **THEN** Synthesis SHALL retain its normal rendering and disposal behavior
- **AND** opening it SHALL NOT invoke Windows native module operations.

## MODIFIED Requirements

### Requirement: Graph retains its imperative surface and interaction channel

Graph SHALL own a persistent Sigma surface, vendor injection, camera and lifecycle cleanup. Matching graph/query-basis continuation pages SHALL merge by row identity; new owners SHALL replace their accumulated window. Hover/selection-only updates SHALL avoid topology reconstruction.

#### Scenario: Chrome or tab visibility changes after Graph mounts

- **WHEN** unrelated chrome changes or the graph is temporarily inactive
- **THEN** the mounted graph surface and camera SHALL remain available for return to that owner
- **AND** final disposal SHALL release graph-owned resources.

#### Scenario: Workbench document is closed after Graph was opened

- **WHEN** the host disposes the Workbench browser and its Graph document
- **THEN** Graph SHALL cancel listeners, observers, animation frames, and timers before browser removal
- **AND** it SHALL dispose the Sigma renderer and its WebGL resources through normal renderer teardown
- **AND** the owning browser/docshell SHALL complete canvas and document disposal
- **AND** on Windows the process lifetime protection SHALL remain in effect throughout delayed native graphics destruction.
