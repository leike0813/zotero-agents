## MODIFIED Requirements

### Requirement: Dashboard Products and Skill Feedback SHALL share stable product browsing behavior

Dashboard Products and Skill Feedback SHALL use the same stable product browsing model for filtering, selection, preview, and export controls.

#### Scenario: Product selection preserves list position

- **GIVEN** the user has scrolled the Products list or a skill-filtered Skill Feedback list
- **WHEN** selecting a product, product file, or feedback record refreshes the Products surface
- **THEN** Dashboard SHALL restore the matching list by a stable scroll owner key
- **AND** SHALL NOT reset that list to the first row.

#### Scenario: Product tree starts collapsed and restores owner state

- **GIVEN** a product file tree is shown for the first time in the current Dashboard page lifecycle
- **THEN** every folder SHALL start collapsed
- **WHEN** the user expands folders, scrolls the tree, switches products, and returns
- **THEN** Dashboard SHALL restore the expansion and scroll state owned by that product
- **AND** a different product SHALL NOT inherit that state.

#### Scenario: Skill Feedback remains selected during background activity

- **GIVEN** the user selected one or more Skill Feedback records
- **AND** another task emits progress updates
- **WHEN** the feedback product set and active skill filter are unchanged
- **THEN** Dashboard SHALL keep the selected feedback records and current Markdown preview visible.

#### Scenario: Skill Feedback select-all respects the active skill filter

- **GIVEN** the Skill Feedback product list is filtered by skill
- **WHEN** the user toggles the select-all checkbox
- **THEN** Dashboard SHALL select or clear only feedback records visible under the active filter
- **AND** feedback records outside the active filter SHALL NOT be selected merely because select-all was toggled.
