## ADDED Requirements

### Requirement: Runtime packaging does not activate a production sidecar

Adding product-owned runtime assets and installation SHALL preserve the current
in-process Synthesis production composition and service inventory.

#### Scenario: Production build includes packaged runtime assets

- **WHEN** the plugin and Synthesis runtime assets are built
- **THEN** no startup hook, default client, Workbench path, Host Bridge path, or
  MCP path SHALL install or launch the service
- **AND** the complete service inventory SHALL remain `108 methods / 1 direct
  consumer`.

### Requirement: Installer dependencies remain platform and data isolated

The runtime installer SHALL depend only on environment-neutral bundle contracts,
packaged-asset reads, runtime platform/path services, hashing, and managed
runtime persistence.

#### Scenario: Installer boundary is checked

- **WHEN** dependency guards inspect the installer
- **THEN** it SHALL not import Synthesis repositories, service composition,
  Zotero Host adapters, canonical writers, subprocess launchers, command
  resolution, or Node-only modules.
