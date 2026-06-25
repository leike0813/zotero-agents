# plugin-localization-governance Specification

## Purpose
Define localization SSOT for ownership, fallback, and CI governance so user-visible copy remains consistent across all supported locales.
## Requirements
### Requirement: Locale key ownership SHALL be explicit by file
Localization keys SHALL follow file ownership rules to avoid drift and duplicated semantics.

#### Scenario: Runtime-facing key placement
- **WHEN** a runtime-facing message is added (toast, dashboard, backend display text)
- **THEN** the key SHALL be defined in `addon.ftl`

#### Scenario: Preferences-only key placement
- **WHEN** a preferences-pane-only label/message is added
- **THEN** the key SHALL be defined in `preferences.ftl`

### Requirement: Cross-file duplicate keys SHALL be controlled
Duplicate localization keys across FTL files are forbidden by default and SHALL only exist through explicit compatibility allowlist.

#### Scenario: Duplicate key outside allowlist
- **WHEN** a key appears in multiple FTL files and is not allowlisted
- **THEN** governance validation SHALL fail

#### Scenario: Compatibility alias key
- **WHEN** a duplicate key is intentionally retained for migration compatibility
- **THEN** it SHALL be declared in an explicit allowlist and tracked for cleanup

### Requirement: Managed local backend localization SHALL use centralized fallback
Managed local backend display name and runtime toast text SHALL use a centralized fallback helper and SHALL not use module-local fixed-language fallback strings.

#### Scenario: Local runtime action/result keys are governed
- **WHEN** new local-runtime action working or user-visible result keys are added
- **THEN** they SHALL be included in governance required-key checks
- **AND** missing keys in any governed locale SHALL fail validation

### Requirement: Localization governance SHALL be CI-gated
Localization governance checks SHALL run in CI gate flow before suite execution.

#### Scenario: Governance regression
- **WHEN** key parity, required keys, duplicate policy, or managed-backend localization wiring is violated
- **THEN** CI gate SHALL fail before running test suite command

#### Scenario: Four-locale hard gate
- **WHEN** governance validator runs
- **THEN** it SHALL validate `en-US`, `zh-CN`, `ja-JP`, and `fr-FR`
- **AND** each locale SHALL have key parity for `addon.ftl` and `preferences.ftl` against `en-US`

### Requirement: Local runtime action/result copy SHALL be governed
Local runtime action-in-progress and user-visible stage-result messages SHALL be treated as required governed keys.

#### Scenario: Local runtime status mapping keys
- **WHEN** local runtime preferences status renderer depends on action-specific working keys or stage-result keys
- **THEN** those keys SHALL exist in all governed locales
- **AND** missing keys SHALL fail governance validation

### Requirement: Synthesis Workbench localization keys SHALL be governed

Synthesis Workbench message keys SHALL be included in localization governance so
supported locales remain complete and fixed UI text does not drift back to
hardcoded English.

#### Scenario: Synthesis message key is added

- **WHEN** a new Synthesis Workbench message key is added to the page message
  dictionary
- **THEN** `addon.ftl` entries for `en-US`, `zh-CN`, `ja-JP`, and `fr-FR` SHALL
  include the key
- **AND** missing Synthesis keys in any supported locale SHALL fail
  localization governance.

#### Scenario: Synthesis UI call site adds fixed text

- **WHEN** Synthesis Workbench source adds fixed user-visible text to common UI
  call sites, table headers, placeholders, titles, aria labels, or DOM text
  nodes
- **THEN** governance SHOULD flag the hardcoded text unless it is explicitly
  recognized as non-UI content, schema/command data, CSS/SVG/internal token, or
  test fixture content.

### Requirement: Workflow package localization SHALL be separate from plugin Fluent governance

Plugin Fluent files SHALL own plugin UI strings, while workflow packages SHALL own workflow-specific fixed display strings.

#### Scenario: Workflow label is package-owned

- **WHEN** a workflow package adds or changes workflow labels, task-name templates, or workflow parameter titles/descriptions
- **THEN** those strings SHALL be declared in workflow package i18n resources or raw workflow manifests
- **AND** they SHALL NOT be required in plugin `addon.ftl` or `preferences.ftl`.

#### Scenario: Plugin shell copy remains Fluent-owned

- **WHEN** plugin shell UI copy around workflow menus, settings pages, toasts, or dashboard controls changes
- **THEN** those strings SHALL remain governed by the plugin Fluent localization rules.

### Requirement: Workflow emoji and core status SHALL remain workflow-owned display metadata

Workflow emoji and core status SHALL be authored in workflow manifests. Plugin Fluent resources SHALL only provide fixed plugin UI copy such as the Dashboard Core badge label.

#### Scenario: Workflow label has package localization and emoji

- **GIVEN** a workflow has package-owned localized label messages and manifest-owned `display.emoji`
- **WHEN** UI code requests a user-visible workflow label
- **THEN** the localized label is resolved from workflow resources
- **AND** the emoji is prefixed from manifest display metadata

#### Scenario: Dashboard core badge label is plugin shell copy

- **GIVEN** Dashboard renders a Core badge
- **WHEN** the badge text is resolved
- **THEN** it is resolved from plugin Fluent resources

### Requirement: Dashboard-family localization SHALL be governed

Dashboard-family fixed UI copy SHALL be governed through Fluent-backed snapshot labels across the supported locale set.

#### Scenario: Dashboard direct UI fallback is introduced

- **WHEN** a Dashboard-family static renderer introduces direct user-visible English fallback in common UI call sites
- **THEN** localization governance MUST fail
- **AND** the fixed copy MUST move behind snapshot labels or an existing localized helper

#### Scenario: Dashboard locale key is missing in a supported locale

- **WHEN** a Dashboard, ACP, run dialog, workflow settings, or Assistant panel Fluent key is added
- **THEN** all supported addon locales MUST define the same key set

### Requirement: Dashboard localization SHALL preserve raw runtime content

Dashboard localization SHALL localize fixed UI chrome and controlled labels only.

#### Scenario: Runtime/user content is displayed

- **WHEN** Dashboard renders workflow labels, backend display names, task messages, runtime logs, ACP transcript content, tool output, generated reports, or free-form errors
- **THEN** the UI MUST preserve the original text
- **AND** it MUST NOT auto-translate that runtime content

### Requirement: Citation role labels are localized

Synthesis Workbench localization SHALL include labels for citation-role filter
chrome and known literature-analysis function values.

#### Scenario: Known roles render through locale messages

- **GIVEN** graph edge roles include known literature-analysis function values
- **WHEN** the Synthesis graph controls or inspector render them
- **THEN** the labels SHALL come from the Synthesis i18n dictionary
- **AND** the four active addon locales SHALL contain the same keys.

### Requirement: Synthesis standalone export localization governance

Synthesis standalone export UI labels SHALL be included in the existing Synthesis
localization dictionary and four-locale Fluent parity checks.

#### Scenario: Export labels are localized

- **GIVEN** the Topic Details export action, save dialog labels, and standalone fallback messages are rendered
- **WHEN** localization governance runs
- **THEN** each fixed UI label is backed by a Synthesis message key
- **AND** `en-US`, `zh-CN`, `ja-JP`, and `fr-FR` contain the same key set
- **AND** export envelope field names and schema identifiers are not treated as user-visible UI copy

### Requirement: User-visible plugin brand text

The plugin SHALL present the current public brand as `Zotero Agents` in active
menus, toolbar labels, preference titles, workspace titles, harness titles, and
Synthesis workbench brand text.

#### Scenario: Visible labels use the current brand
- **WHEN** the plugin renders an active user-facing label for the product
- **THEN** the label uses `Zotero Agents`
- **AND** it does not use `Zotero Skills` or `Zotero-Skills` unless describing
  a compatibility-only internal identifier.

#### Scenario: Compatibility identifiers are preserved
- **WHEN** code refers to add-on identity, resource namespaces, global bridge
  object names, event names, or preference prefixes
- **THEN** existing `zotero-skills` / `ZoteroSkills` identifiers MAY remain
  unchanged for upgrade compatibility.

### Requirement: Bundled help center shell localization SHALL be governed

Bundled help center shell labels SHALL be localized for every locale included in the bundled help manifest, even when those labels are loaded before Fluent resources are available to the chrome page.

#### Scenario: Help center shell label is added

- **WHEN** the bundled help center adds a fixed shell label such as title, Online Docs, language selector, loading state, unavailable state, or failure state
- **THEN** the help center SHALL provide that label for every bundled help locale
- **AND** the bundled help center packaging tests SHALL cover the localization table contract.

