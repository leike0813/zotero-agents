## ADDED Requirements

### Requirement: GitHub Pages deployment

The CI workflow SHALL build the Docusaurus site and deploy it to GitHub Pages on every push to `main` that changes files under `site/`.

#### Scenario: Build and deploy to GitHub Pages
- **WHEN** a push to `main` includes changes under `site/`
- **THEN** the workflow runs `docusaurus build` and deploys `site/build/` to GitHub Pages

#### Scenario: Manual workflow trigger
- **WHEN** the workflow is manually triggered via GitHub Actions UI
- **THEN** the build and deploy steps execute identically to the push trigger

### Requirement: Gitee Pages sync

The CI workflow SHALL push the built site to a Gitee Pages branch (`gh-pages`) and trigger a Gitee Pages rebuild, preserving the same mechanism as the current workflow.

#### Scenario: Push to Gitee
- **WHEN** the GitHub build completes successfully and `GITEE_TOKEN` is set
- **THEN** the built files are pushed to the `gh-pages` branch of the Gitee repository

#### Scenario: Trigger Gitee rebuild
- **WHEN** the Gitee push succeeds
- **THEN** a POST request is sent to the Gitee API to trigger a Pages rebuild

### Requirement: CI workflow updates

The existing `deploy-user-docs.yml` SHALL be updated to:
- Change the build command from `npx vitepress build site` to `docusaurus build` (run from `site/` directory)
- Change the artifact upload path from `site/.vitepress/dist` to `site/build`
- Change the Gitee push path from `site/.vitepress/dist` to `site/build`

#### Scenario: Updated build command runs
- **WHEN** the CI workflow runs
- **THEN** `npm run docs:build` (or equivalent `docusaurus build` command) is executed and exits with code 0

#### Scenario: Artifact path matches Docusaurus output
- **WHEN** the workflow uploads the build artifact
- **THEN** the artifact path `site/build/` contains all static files for GitHub Pages
