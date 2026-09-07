## ADDED Requirements

### Requirement: Dashboard and management windows use typed Preact page entries

Dashboard, Backend Manager and Workflow Settings SHALL build from TypeScript/TSX page sources under `src/dashboard` using Preact. Their packaged script names and host loading behavior SHALL remain stable. The handwritten addon scripts SHALL be retired when the replacement entries are enabled.

#### Scenario: Plugin build packages the migrated pages

- **WHEN** the plugin builds Dashboard and its management windows
- **THEN** each page SHALL load its generated bundle through the existing HTML/script resource path
- **AND** no second handwritten production renderer SHALL be required.

### Requirement: Dashboard renders independently memoized regions

Dashboard SHALL use stable region containers, page projection and independent Preact roots for its tab bar and active business surfaces. Region equality SHALL use shared signature primitives and only the region's visible content and relevant interaction state.

#### Scenario: Runtime logs change while chrome is unchanged

- **WHEN** a snapshot changes only the visible runtime-log data
- **THEN** the log region SHALL update while unchanged navigation and controls retain their DOM identity.

#### Scenario: User navigates between Dashboard surfaces

- **WHEN** the user opens Home, workflow options, Products, a backend, logs, Sidecar traces, audit or replay
- **THEN** the corresponding region SHALL preserve its existing available actions and loading/empty/error behavior.

### Requirement: Dashboard wire contracts preserve host semantics

Dashboard snapshots, action payload maps and message envelopes SHALL be defined by portable shared contracts consumed by page and host. Extraction SHALL preserve existing action names, payload meaning and host refresh governance. Privileged host implementation SHALL NOT enter page runtime imports.

#### Scenario: A page sends a workflow or backend action

- **WHEN** a Dashboard control or child window dispatches an existing action
- **THEN** its payload SHALL follow the shared contract and existing host route
- **AND** host-side validation and action behavior SHALL remain authoritative.

### Requirement: Dashboard forms and backend presentation reuse shared components

Dashboard and Workflow Settings SHALL share field rendering, conditional visibility, numeric validation and draft behavior. Backend task presentation SHALL reuse common rendering across supported backend kinds while preserving their available actions.

#### Scenario: A workflow field appears in either settings surface

- **WHEN** the same descriptor is edited in Dashboard or the settings window
- **THEN** visibility, valid values and emitted workflow/provider/run/host options SHALL follow the same form rules.

### Requirement: Dashboard high-frequency rows have bounded owned rendering

Runtime logs SHALL render a bounded row window and preserve unchanged row/control identity. Sidecar traces SHALL reconcile by trace identity and preserve the current selection and detail. Page/component owners SHALL clean up replay, draft and feedback timers and listeners.

#### Scenario: Logs or traces append while being inspected

- **WHEN** new rows arrive during selection or scrolling
- **THEN** unchanged visible rows and controls SHALL retain identity
- **AND** the renderer SHALL respect its row bound and preserve applicable user scroll/selection state.

### Requirement: Dashboard resolves visible labels during rendering

Dashboard and child-window components SHALL consume injected labels through props/projection and retain the existing shared theme/assets. Localization governance SHALL inspect their TypeScript/TSX source directories.

#### Scenario: Host supplies translated labels

- **WHEN** a page renders a snapshot with host labels
- **THEN** controls and headings SHALL consume those labels without a whole-page reverse-text translation pass.

### Requirement: Dashboard refresh preserves region interaction state
Dashboard SHALL preserve unchanged log/trace row identity, input focus, product expansion and applicable scroll positions across snapshot refreshes. Closing a page SHALL stop its timers, observers and event listeners.

#### Scenario: Snapshot repeats during user interaction
- **WHEN** Dashboard receives an equivalent snapshot while the user inspects logs or a product tree
- **THEN** unchanged rows and controls retain identity and the current scroll/expansion state remains intact.

#### Scenario: Dashboard window closes
- **WHEN** Dashboard or a management child window closes
- **THEN** no page-owned delayed callback mutates its disposed DOM.
