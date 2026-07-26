## ADDED Requirements

### Requirement: Workflow Host API executes ordered text export translators

Workflow Host API v10 SHALL expose a generic item text-export operation that executes registered Zotero export translators in caller-provided priority order.

#### Scenario: Preferred translator succeeds

- **WHEN** `hostApi.items.exportText()` receives Zotero items, ordered translator candidates, and bounded display options
- **AND** the first candidate is a registered export translator that returns non-empty text
- **THEN** the host SHALL return that text, the actual translator identity, `fallbackUsed: false`, and an ordered successful attempt record
- **AND** SHALL pass the supplied item set to one `Zotero.Translate.Export` execution.

#### Scenario: Host advances to fallback translator

- **WHEN** a candidate is unavailable, translator lookup fails, translation throws, or translation returns empty text
- **THEN** the host SHALL record a structured attempt status
- **AND** SHALL try the next candidate without requiring plugin-specific workflow logic
- **AND** a later success SHALL report `fallbackUsed: true` and the actual translator identity.

#### Scenario: Every candidate fails

- **WHEN** every ordered translator candidate is unavailable or cannot return non-empty text
- **THEN** the host SHALL return a structured failure containing all attempt records
- **AND** SHALL NOT claim a successful translator or output.

#### Scenario: Workflow remains decoupled from plugin-private interfaces

- **WHEN** a workflow requests Better BibTeX output through the registered translator candidate
- **THEN** the workflow SHALL NOT require a Better BibTeX global object, add-on-manager lookup, fixed localhost port, or JSON-RPC call.
