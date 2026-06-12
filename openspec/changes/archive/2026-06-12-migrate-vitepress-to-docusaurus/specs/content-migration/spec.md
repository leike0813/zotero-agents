## ADDED Requirements

### Requirement: VitePress-specific frontmatter removal

All 17 existing Markdown files SHALL have VitePress-specific frontmatter fields removed or converted:
- Remove any `editLink` overrides (Docusaurus handles this via config)
- Convert `layout: home` or similar VitePress-specific directives to Docusaurus equivalents
- Ensure each file has `slug` or `id` frontmatter matching its current URL path

#### Scenario: Frontmatter converted
- **WHEN** inspecting the frontmatter of each migrated `.md` file
- **THEN** no VitePress-specific directives are present

### Requirement: Internal links converted

All internal markdown links SHALL be converted from VitePress format to Docusaurus format:
- VitePress: `[text](installation)` (relative path)
- Docusaurus: `[text](/installation)` (absolute path from docs root)

#### Scenario: Internal links resolved
- **WHEN** building the site
- **THEN** Docusaurus reports no broken internal links

### Requirement: Content moved to docs/ directory

All 17 existing Markdown files SHALL be moved from `site/` root to `site/docs/` directory, maintaining the same subdirectory structure for sections:
- `site/docs/intro.md` — previously `site/index.md`
- `site/docs/installation.md` — unchanged
- `site/docs/getting-started.md` — unchanged
- `site/docs/backends/` — unchanged
- `site/docs/workflows/` — unchanged
- `site/docs/sidebar/` — unchanged
- `site/docs/synthesis/` — unchanged
- `site/docs/dashboard.md` — unchanged
- `site/docs/preferences.md` — unchanged

Note: `site/index.md` is renamed to `site/docs/intro.md` because Docusaurus docs plugin manages document routes, not the root `index.md`.

#### Scenario: Files exist in new location
- **WHEN** listing `site/docs/` recursively
- **THEN** all 17 files are present with correct subdirectory structure

#### Scenario: Root index.md removed or repurposed
- **WHEN** checking `site/index.md`
- **THEN** it has been removed (the home page is now handled by `src/pages/index.tsx` or the docs plugin)

### Requirement: Home page implementation

The home page SHALL be implemented in one of two ways:
- **Option A**: `src/pages/index.tsx` React component that redirects to `/intro` using `@docusaurus/Link` or `window.location`
- **Option B**: `src/pages/index.tsx` that shows a simple brand landing page with a "进入文档" call-to-action button

#### Scenario: Home page accessible
- **WHEN** visiting `/Zotero-Skills/`
- **THEN** the user sees a usable home page (either the intro content or a landing page)
