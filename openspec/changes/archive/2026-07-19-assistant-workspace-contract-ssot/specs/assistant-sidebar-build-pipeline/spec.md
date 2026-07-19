## ADDED Requirements

### Requirement: Sidebar page scripts are built by esbuild

Assistant Workspace sidebar page scripts SHALL live as ES modules under
`src/sidebar/` and SHALL be delivered to pages only as esbuild-produced
bundles (`acp-child.bundle.js`, `run-dialog.bundle.js`,
`assistant-workspace.bundle.js`) referenced by body-end classic script tags.
Hand-written script files SHALL NOT be added under `addon/content/sidebar/`
or `addon/content/shared/assistant/`.

#### Scenario: A page loads its panel logic

- **WHEN** an Assistant Workspace sidebar page loads
- **THEN** vendor libraries (katex, markdown-it, texmath) load as static
  scripts ahead of the page bundle
- **AND** the page's panel, renderer, and controller logic arrives only
  through the page's esbuild bundle.

#### Scenario: Load-time startup semantics are preserved

- **WHEN** the acp-child bundle evaluates without a `document` global
- **THEN** auto-boot SHALL NOT run
- **AND** when it evaluates in a page, boot SHALL run exactly once, matching
  the legacy script-tag behavior.

### Requirement: Page bundles import only pure code

Modules under `src/sidebar/` SHALL import only relative paths and
`src/shared/**`. An ESLint boundary rule SHALL reject imports of package
specifiers and of privileged trees such as `src/modules/`.

#### Scenario: A page module imports a privileged module

- **WHEN** a file under `src/sidebar/` imports from `src/modules/` or a
  package specifier
- **THEN** lint SHALL fail.
