## Purpose

Provide an independently hosted, usable Zotero Agent configuration interface that separates model connections, MCP, search and maintenance while preserving scoped evidence, draft ownership and credential privacy.

## ADDED Requirements

### Requirement: Configuration uses one independently owned window

Zotero Agent settings SHALL open in its own window with left navigation. Preferences SHALL place its entry immediately left of Backend Manager. Backend Manager and Workspace Pi configuration entries SHALL open or focus that same settings window directly. Reopening SHALL preserve existing drafts; closing another window SHALL NOT close settings.

#### Scenario: Both management windows are open

- **WHEN** a user opens settings from Backend Manager and opens it again from preferences
- **THEN** the settings window is focused without duplicate windows or draft reset, and Backend Manager remains independently usable

### Requirement: Approved page responsibilities remain distinct

The interface SHALL provide onboarding, a model connection/workbench page, separate MCP and search pages, and catalog/maintenance. Defaults SHALL be actions on model cards rather than a separate page. Conversation model picking and configuration-free web fetching SHALL remain outside this interface. Revision 7 SHALL constrain navigation, information hierarchy and action flow.

#### Scenario: User configures MCP and search

- **WHEN** the user navigates between MCP and search
- **THEN** each has its own left-navigation entry and page, and onboarding offers separate entry actions

#### Scenario: Implementation adapts to host theme

- **WHEN** visual details change for theme, sizing or accessibility
- **THEN** page responsibilities, hierarchy and action sequence remain consistent with the approved fixed prototype

### Requirement: Onboarding leads to explicit model use

Onboarding SHALL lead users through connecting a provider/account, adding a model and explicitly assigning its default purpose. It SHALL distinguish login, saved connection, discovered models, required facts, permission and actual model-test completion. No added connection or model SHALL silently become the default.

#### Scenario: Account login succeeds without a saved connection

- **WHEN** login completes while the connection is still a draft
- **THEN** login is shown as complete, saving the connection and assigning a model remain separate actions, and canceling the draft retains the independent registration

### Requirement: One connection supports separate model cards

A saved connection SHALL reuse one authentication binding for multiple model cards. Cards SHALL expose model options, current availability, general/conversation/Skill Run/title purposes and applicable test results. Missing specialized defaults SHALL inherit the general default; absent title selection SHALL disable provider-based titles. Effects of removal SHALL be shown before confirmation.

#### Scenario: Two models share a provider key

- **WHEN** the user adds two models under a saved connection
- **THEN** no second key entry is requested and options, purposes and test results remain independently attributable to each model

#### Scenario: A default model is removed

- **WHEN** a confirmed removal affects general, specialized or title purposes
- **THEN** affected general use becomes unset, specialized use returns to general inheritance and title use disables, without selecting an arbitrary replacement

### Requirement: ChatGPT controls preserve registration semantics

The connection workbench SHALL offer distinct registration selection, browser login/cancel/reauthorization, actual plan-permission state, welcome confirmation, usage management and sign out/removal. Same-email registrations SHALL remain distinguishable. Inference and recovery SHALL retain existing registration-scoped admission; only a user-triggered actually completed model probe can lift quota pause.

#### Scenario: A registration lacks plan permission

- **WHEN** a verified login has no required granted scope
- **THEN** login remains saved, the connection offers reauthorization, and inference is not reported as available

#### Scenario: One registration is paused

- **WHEN** another registration logs in or completes its model test
- **THEN** the first remains paused and no existing task automatically resumes

### Requirement: Model discovery and catalog browsing are honest and bounded

Opening settings SHALL use adopted local data without account discovery or inference. Public provider/model browsing SHALL be filtered and bounded, distinguish actual adapter/authentication support and show reasons for unavailable additions. Login, explicit registration switch or refresh SHALL discover only that identity. Unknown facts SHALL remain unknown without same-name inheritance.

#### Scenario: Unsupported provider appears in the public directory

- **WHEN** the user browses an entry lacking a supported execution or authentication adapter
- **THEN** its reason is visible and addition is unavailable, without presenting custom endpoints as a universal workaround

#### Scenario: Discovery fails or returns empty

- **WHEN** refresh fails with same-identity adopted results or succeeds with an empty result
- **THEN** failure retains those adopted results, successful empty replaces visibility, and existing cards/default references remain with applicable availability reasons

### Requirement: MCP forms guide transport configuration

MCP SHALL use ordered parameter and environment name/value entries for stdio, and common authentication controls for HTTP. Empty working directory SHALL show a default-runtime-directory hint without persisting the hint. Bearer SHALL ask for token only; API key SHALL guide field type/name. Uncommon headers SHALL use folded advanced entries. Whole-document JSON SHALL remain an explicit alternative.

#### Scenario: An argument contains spaces and cwd is empty

- **WHEN** a stdio source is saved from entry controls
- **THEN** the argument stays one ordered argv item and cwd retains default-directory semantics

#### Scenario: HTTP authentication is edited

- **WHEN** a user changes between Bearer, API key and no authentication
- **THEN** only the intended field binding is retained/replaced/cleared and no secret is borrowed from another field

### Requirement: Credentials and transient values remain private

Saved secrets SHALL display only field/save status or redacted metadata, never plaintext refill. Secret submission SHALL clear its input and SHALL NOT enter snapshots, persisted drafts, exported configurations, status results or logs. Empty edits SHALL retain only an existing same-field binding; explicit removal SHALL clear that binding. Structured failures SHALL NOT echo raw submitted JSON or native errors.

#### Scenario: Imported credentials fail validation

- **WHEN** a full-document JSON draft includes secrets and cannot be adopted
- **THEN** the local editable draft is preserved, old authoritative state is unchanged and failure feedback contains no submitted secret

### Requirement: Search has independent source configuration and tests

Search SHALL expose the curated sources, per-source required fields, enabled state, accessible saved ordering and explicit source tests. Saved complete disabled sources SHALL be testable without enabling them. Native sources SHALL bind actual saved compatible model configurations. Tests SHALL warn about applicable charges and report only that source's actual result.

#### Scenario: A disabled source is tested

- **WHEN** a user tests its complete saved configuration
- **THEN** only it executes, enabled state/order remain unchanged, and another source's success cannot satisfy its result

### Requirement: Maintenance has three folded owner-scoped sections

Catalog browsing SHALL remain visible. Public directory updates/recovery, model information supplements and global redacted diagnostics SHALL occupy three initially folded sections. Account discovery SHALL stay with its connection. Each operation SHALL retain local feedback and prior adopted content on failure; canceled diagnostic destination selection SHALL create no file.

#### Scenario: Public restore fails while a form is open

- **WHEN** persistence fails during restore
- **THEN** adopted data, automatic-update setting and unrelated form draft remain, and only the restore section reports failure

#### Scenario: Supplement source disappears

- **WHEN** refresh cannot read a previously adopted supplement file
- **THEN** its adopted declarations remain until explicit removal

### Requirement: Drafts and async results belong to their objects

Leaving an unsaved form SHALL offer save, discard or continue editing; failed save SHALL retain that form and draft. Card actions SHALL save individually. Feedback SHALL bind to object, request and configuration/authentication identity, reject obsolete results and preserve unrelated region DOM/focus. Each page SHALL have one main content scroller with fixed navigation/header.

#### Scenario: Another object's test completes during editing

- **WHEN** a source/card test or directory update completes while a different form is being edited
- **THEN** its own region updates without replacing the other form, focus or selection

#### Scenario: Settings window closes during authorization

- **WHEN** the window closes
- **THEN** its attempt/probes and publication scope end, late results cannot recreate the page, and shared owner work needed elsewhere retains its existing lifecycle

### Requirement: Full UI verification precedes real-account handoff

All approved settings pages and necessary runtime behavior SHALL be implemented and verified in installed Zotero before the user resumes the existing blocked ChatGPT tasks. Normal/compact size, light/dark themes, mouse/keyboard controls, draft protection and key failure paths SHALL be reviewed against revision 7. Controlled UI evidence SHALL NOT certify real service or C20 completion.

#### Scenario: Only the login workbench is implemented

- **WHEN** MCP, search or maintenance is still unfinished
- **THEN** the UI handoff is incomplete even if controlled login tests pass

#### Scenario: Full UI is ready

- **WHEN** all pages and required behavior have installed-host verification
- **THEN** the actual settings entry and candidate are handed to the user for the existing real-account tasks, whose evidence remains separately pending until obtained
