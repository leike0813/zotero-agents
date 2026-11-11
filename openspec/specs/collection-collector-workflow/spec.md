# collection-collector-workflow Specification

## Purpose
Define the `collection-collector` SkillRunner workflow that builds an auditable Zotero collection membership selection from current library and Synthesis read surfaces, and applies it through the workflow apply hook.
## Requirements
### Requirement: Collection collector workflow is discoverable

The system SHALL provide a non-core automatic SkillRunner workflow named `collection-collector` that requires no Zotero selection.

#### Scenario: Workflow parameters are configured

- **WHEN** the workflow settings are rendered
- **THEN** `collection` SHALL be a required strict `zotero.collections` option without an empty choice
- **AND** `collectionScope` SHALL be required free text
- **AND** no selection, threshold, candidate-count, language, or Topic parameter SHALL be present.

### Requirement: Skill selects existing library literature

The skill SHALL produce an auditable collection membership selection from current Zotero and Synthesis read surfaces without mutating Zotero.

#### Scenario: Inventory is collected

- **WHEN** valid input and Host Bridge access are available
- **THEN** the runtime SHALL page all top-level regular items in the target collection's library
- **AND** it SHALL page current collection membership and available Topic inventory
- **AND** existing collection members SHALL be excluded from candidate assessment.

#### Scenario: Candidate assessment is bounded

- **WHEN** scope matches or relevant Topic source papers produce candidates
- **THEN** deterministic ranking SHALL select at most 250 papers for semantic assessment
- **AND** assessment SHALL use packets of at most 20 papers
- **AND** truncation SHALL be reported as a diagnostic.

#### Scenario: Papers are selected

- **WHEN** every assessment packet has exact valid coverage
- **THEN** only papers with semantic relevance of at least `0.65` SHALL be selected
- **AND** every selected paper SHALL include its stable ref, title, evidence basis, Topic matches, reason, and caveats
- **AND** final order SHALL be descending semantic relevance followed by ascending paper ref.

#### Scenario: No paper matches

- **WHEN** no assessed paper meets the threshold
- **THEN** the skill SHALL return a successful empty selection
- **AND** workflow apply SHALL perform no mutation.

#### Scenario: Synthesis evidence is unavailable

- **WHEN** Topic inventory, Topic context, or item detail cannot be read
- **THEN** selection SHALL degrade to available metadata and tags
- **AND** diagnostics SHALL record the unavailable evidence
- **AND** the skill SHALL NOT refresh or mutate Synthesis state.

### Requirement: Apply owns collection mutation

The workflow apply hook SHALL be the only collection write path used by this workflow.

#### Scenario: Selection is applied

- **WHEN** a valid selection is returned
- **THEN** apply SHALL require the result collection to match the original parameter
- **AND** SHALL validate every pending item as unique, same-library, existing, top-level, regular, and above the threshold
- **AND** SHALL add the remaining refs through one `collection.addItems` mutation.

#### Scenario: Membership changed during execution

- **WHEN** selected items were added to the collection before apply
- **THEN** apply SHALL remove those refs from the pending mutation
- **AND** repeated apply SHALL not duplicate membership.

### Requirement: Collection collector passes through opaque library cursors

The collection collector SHALL start library inventory paging without a cursor and SHALL continue only with the exact opaque cursor returned by the previous page.

#### Scenario: Inventory pagination starts and continues

- **WHEN** the runtime requests the first library inventory page
- **THEN** it SHALL omit `cursor`
- **AND** when a page returns `nextCursor`, the next request SHALL pass that value through unchanged
- **AND** it MUST NOT initialize, parse, or increment a numeric offset cursor.

### Requirement: Collector SHALL use platform-correct Bridge launchers

The collector SHALL preserve an existing explicit Bridge executable override. Automatic Windows workspace selection SHALL prefer the supplied CMD wrapper, then a native executable; POSIX selection SHALL use the shell shim. If no workspace candidate exists, selection SHALL fall back to PATH. Automatic Windows selection MUST NOT execute the POSIX shim.

#### Scenario: Both workspace shims are supplied on Windows

- **WHEN** the workspace contains the POSIX shim and CMD wrapper and no explicit override is selected
- **THEN** the collector SHALL execute the CMD wrapper successfully.

#### Scenario: Explicit executable is supplied

- **WHEN** an existing explicit Bridge executable override is configured
- **THEN** it SHALL take precedence over workspace and PATH candidates.

### Requirement: Collector SHALL preserve JSON query bytes across launchers

Collector Bridge queries SHALL reach the CLI as complete UTF-8 JSON independently of launcher shell expansion. Receipts SHALL retain the semantic query payload.

#### Scenario: Query contains shell-sensitive or non-ASCII content

- **WHEN** a query contains Chinese text, spaces, quotes, percent signs, or shell metacharacters
- **THEN** the CLI SHALL receive the original JSON values without expansion or reinterpretation.
