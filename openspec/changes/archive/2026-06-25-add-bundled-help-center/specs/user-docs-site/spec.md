## ADDED Requirements

### Requirement: Bundled Help Docs Generation

The project SHALL generate a bundled documentation set from the Docusaurus docs
source tree for inclusion in the plugin package.

#### Scenario: Help docs build output exists

- **WHEN** `npm run build:help-docs` runs successfully
- **THEN** `addon/content/help-docs/manifest.json` SHALL exist
- **AND** generated Markdown docs SHALL exist under
  `addon/content/help-docs/docs/{locale}/`
- **AND** referenced image assets SHALL exist under
  `addon/content/help-docs/assets/img/`.

#### Scenario: All Docusaurus docs locales are bundled

- **WHEN** a docs locale exists under
  `site/i18n/{locale}/docusaurus-plugin-content-docs/current`
- **THEN** the bundled help manifest SHALL include that locale
- **AND** English docs from `site/docs` SHALL always be included.

#### Scenario: Docusaurus syntax is converted for plugin rendering

- **WHEN** docs contain frontmatter, admonitions, internal doc links, or image
  references
- **THEN** the generated docs SHALL remove frontmatter
- **AND** convert admonitions into renderer-compatible Markdown
- **AND** rewrite internal doc links to bundled help navigation targets
- **AND** rewrite image references to packaged chrome asset URLs.

#### Scenario: Help docs image assets are size-controlled

- **WHEN** docs reference raster images
- **THEN** the generated assets SHALL be compressed at build time
- **AND** the help docs checker SHALL fail if the bundled help docs exceed the
  configured size budget.

### Requirement: Bundled Help Center Runtime

The plugin SHALL provide a bundled help center that reads generated documentation
assets from the packaged plugin and remains usable without the external docs
site.

#### Scenario: Help opens inside Zotero

- **WHEN** the user activates the Help entry point from the workspace toolbar or
  preferences About section
- **THEN** Zotero SHALL open the bundled help center in an internal tab.

#### Scenario: Locale is selected from available bundled docs

- **WHEN** the help center opens
- **THEN** it SHALL choose the best bundled locale by exact locale match or
  language-prefix match
- **AND** it SHALL fall back to English when no match exists.

#### Scenario: Independent help panes scroll

- **WHEN** the bundled help center opens inside a Zotero tab
- **THEN** the navigation pane SHALL be scrollable independently of the document
  reading pane
- **AND** the document reading pane SHALL be scrollable independently of the
  navigation pane.

#### Scenario: Navigation and locale controls stay inside the sidebar

- **WHEN** bundled help locales include labels wider than the sidebar
- **THEN** the locale selector SHALL remain clickable inside the sidebar
- **AND** navigation category and document labels SHALL wrap or break without
  widening the sidebar.

#### Scenario: Bundled images use documentation-sized rendering

- **WHEN** generated help docs include screenshots, icon images, or poster images
- **THEN** screenshots SHALL be constrained to the reading column
- **AND** icon images SHALL render compactly
- **AND** poster images SHALL render as compact centered images.

#### Scenario: Online Docs opens the published docs root

- **WHEN** the user clicks Online Docs from the workspace toolbar, preferences
  About section, or bundled help center
- **THEN** Zotero SHALL launch the configured published documentation root in the
  external browser.

#### Scenario: Help chrome text follows selected bundled locale

- **WHEN** the user switches the bundled help locale
- **THEN** help-center chrome labels such as title, Online Docs, language
  selector, loading state, and failure state SHALL update for that locale when a
  bundled translation exists.

## MODIFIED Requirements

### Requirement: Locale 分流函数

系统 SHALL provide `getDocsBaseUrl()` / `getDocsUrl()` helpers for user-facing
online documentation links.

#### Scenario: Debug docs routing

- **WHEN** debug mode is enabled
- **THEN** `getDocsBaseUrl()` SHALL return the local Docusaurus server URL.

#### Scenario: Production docs routing

- **WHEN** debug mode is not enabled
- **THEN** `getDocsBaseUrl()` SHALL return the GitHub Pages docs URL regardless
  of locale.

#### Scenario: Bundled help is the offline fallback

- **WHEN** the published docs site is unreachable for a user
- **THEN** the bundled Help entry point SHALL remain available without relying on
  Gitee Pages or any plugin-internal HTTP server.
