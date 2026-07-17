## ADDED Requirements

### Requirement: Citation Graph application preserves dependency direction
Contracts, engine, application, and repository modules SHALL remain environment-neutral; only the designated service adapter SHALL bind the application compute port to the worker pool, and workers SHALL remain persistence-free.

#### Scenario: Static boundary rejects authority leakage
- **WHEN** a shared graph module imports Node, Zotero, Host, UI, plugin service, SQLite, or worker construction authority
- **THEN** service boundary verification fails
