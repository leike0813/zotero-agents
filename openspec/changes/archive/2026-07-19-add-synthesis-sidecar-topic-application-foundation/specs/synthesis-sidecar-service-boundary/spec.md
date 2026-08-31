## ADDED Requirements

### Requirement: Topic application preserves dependency direction
Contracts, engine, application, and repository packages SHALL remain free of Node, Zotero, Host, UI, and plugin dependencies; only designated service adapters SHALL import Node filesystem, path, SQLite, or crypto authority.

#### Scenario: Static boundary rejects environment leakage
- **WHEN** a shared Topic module imports an environment-specific dependency or a service worker imports persistence authority
- **THEN** the boundary verification fails
