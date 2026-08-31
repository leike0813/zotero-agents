## ADDED Requirements

### Requirement: Loader SHALL inject only the closed v12 Workflow Host
Workflow loading and hook execution SHALL provide the exact current Workflow Host projection, pure package-local helpers, manifest inputs, and declared execution context. The loader SHALL NOT inject raw Zotero globals, handlers, IOUtils, direct clipboard access, or other host-capable runtime objects.

#### Scenario: Valid v12 hook is loaded
- **WHEN** an official hook imports only package code and consumes declared Workflow Host members
- **THEN** loader execution succeeds without any raw host global in scope

#### Scenario: Hook references IOUtils
- **WHEN** a hook attempts to use the removed injected IOUtils object
- **THEN** validation or execution fails and no compatibility injection is added

### Requirement: Loader diagnostics SHALL derive current identity from the manifest owner
Loader diagnostics SHALL use the canonical v12 identity and recursive inspection result rather than maintaining a second version constant or capability list.

#### Scenario: Projection shape drifts
- **WHEN** the injected projection differs from the canonical manifest
- **THEN** loader diagnostics report structured conformance facts and current build gates fail
