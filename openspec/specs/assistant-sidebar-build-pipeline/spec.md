# assistant-sidebar-build-pipeline Specification

## Purpose
Governs the build pipeline and import boundaries for Assistant Workspace sidebar page scripts, ensuring they are delivered as esbuild bundles with clean dependency boundaries.
## Requirements
### Requirement: Sidebar page scripts are built by esbuild

Assistant Workspace sidebar page scripts SHALL live as ES modules under
`src/sidebar/` and SHALL be delivered to pages only as esbuild-produced
bundles (`acp-child.bundle.js`, `assistant-workspace.bundle.js`)
referenced by body-end classic script tags. Hand-written script files
SHALL NOT be added under `addon/content/sidebar/` or
`addon/content/shared/assistant/`. The SkillRunner page SHALL load the
shared `acp-child.bundle.js`; a SkillRunner-specific bundle SHALL NOT
exist.

Assistant child chrome regions MAY be implemented as Preact components in
`src/sidebar/components/*.tsx`, compiled by esbuild with the Preact JSX
automatic runtime and delivered inside the page bundle. Preact SHALL NOT
be added as a static vendor script. Component sources SHALL type-check
under the dedicated DOM-lib program `tsconfig.sidebar.json`; the
DOM-free root program SHALL exclude them.

#### Scenario: A page loads its panel logic

- **WHEN** an Assistant Workspace sidebar page loads
- **THEN** vendor libraries (katex, markdown-it, texmath) load as static
  scripts ahead of the page bundle
- **AND** the page's panel, renderer, controller logic, and Preact
  component code arrive only through the page's esbuild bundle.

#### Scenario: Load-time startup semantics are preserved

- **WHEN** the acp-child bundle evaluates without a `document` global
- **THEN** auto-boot SHALL NOT run
- **AND** when it evaluates in a page, boot SHALL run exactly once,
  matching the legacy script-tag behavior.

#### Scenario: Component sources are typed against the DOM environment

- **WHEN** the build runs type checking
- **THEN** `src/sidebar/**/*.tsx` and `src/shared/**/*.ts` SHALL be
  checked by `tsconfig.sidebar.json` with DOM lib available
- **AND** the root sandbox program SHALL remain DOM-free and SHALL NOT
  include the `.tsx` component sources.

### Requirement: Page bundles import only pure code

Modules under `src/sidebar/` SHALL import only relative paths,
`src/shared/**`, and the Preact entry points `preact`, `preact/hooks`,
`preact/compat`, and `@preact/signals`. An ESLint boundary rule SHALL
reject imports of any other package specifier and of privileged trees
such as `src/modules/`.

#### Scenario: A page module imports a privileged module

- **WHEN** a file under `src/sidebar/` imports from `src/modules/` or a
  non-Preact package specifier
- **THEN** lint SHALL fail.

#### Scenario: A component module imports Preact

- **WHEN** a file under `src/sidebar/` imports `preact`, `preact/hooks`,
  `preact/compat`, or `@preact/signals`
- **THEN** lint SHALL pass
- **AND** esbuild SHALL inline the imported code into the page bundle.
