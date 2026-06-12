# docusaurus-site Specification

## Purpose
TBD - created by archiving change migrate-vitepress-to-docusaurus. Update Purpose after archive.

## Requirements

### Requirement: Docusaurus project scaffold

The system SHALL provide a Docusaurus project in the `site/` directory with `docusaurus.config.ts`, `sidebars.ts`, `src/pages/index.tsx`, `src/css/custom.css`, and `package.json`.

#### Scenario: Dev server starts without error
- **WHEN** running `docusaurus start` in the `site/` directory
- **THEN** dev server starts on `localhost:3000` and serves all routes without 404

#### Scenario: Production build succeeds
- **WHEN** running `docusaurus build` in the `site/` directory
- **THEN** build output is generated at `site/build/` with correct HTML files for all 17 routes

### Requirement: i18n configuration

The system SHALL provide built-in i18n support with zh-CN as the default locale and en as an additional locale.

#### Scenario: Chinese content served at root paths
- **WHEN** visiting `/Zotero-Skills/installation`
- **THEN** the Chinese version of the installation page is served

#### Scenario: English locale expansion path
- **WHEN** English `.md` files are placed in `site/i18n/en/docusaurus-plugin-content-docs/current/`
- **THEN** visiting `/Zotero-Skills/en/installation` serves the English version

### Requirement: sidebar parity with current VitePress

The Docusaurus sidebar SHALL have exactly the same structure as the current VitePress sidebar, organized into 7 groups.

#### Scenario: All sidebar items render
- **WHEN** navigating to any documentation page
- **THEN** the sidebar displays all 7 groups with correct labels and links

### Requirement: URL parity with current VitePress

All documentation page URLs SHALL remain unchanged after the migration.

#### Scenario: All old URLs return 200
- **WHEN** requesting each of the 17 routes
- **THEN** the server returns HTTP 200 with the correct Chinese content

### Requirement: npm scripts

The root `package.json` SHALL provide npm scripts for local development: `docs:dev`, `docs:build`, `docs:serve`.

#### Scenario: npm run docs:dev starts dev server
- **WHEN** running `npm run docs:dev`
- **THEN** the Docusaurus dev server starts on port 3000
