## ADDED Requirements

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
