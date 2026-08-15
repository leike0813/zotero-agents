## ADDED Requirements

### Requirement: Callers SHALL import owning modules instead of one-line re-export facades

Workflow execution callers SHALL import the owning module directly when a
facade would only re-export one function. Single-function re-export facades
SHALL NOT be added; import-site aliases SHALL be used for compatibility naming.

#### Scenario: Dynamic single-function consumers target the owning module

- **WHEN** a caller needs a lazy single-function import
- **THEN** the dynamic import SHALL target the owning module
- **AND** the caller SHALL NOT route the import through a one-line re-export module.

#### Scenario: Static policy consumers target the owning module

- **WHEN** workflow seams consume selection policy functions
- **THEN** import statements SHALL target the owning trigger policy module directly
- **AND** compatibility aliases SHALL live at the import site.

#### Scenario: Deleted facades leave owning exports intact

- **WHEN** a shallow re-export facade is removed
- **THEN** the owning module SHALL keep its exported functions unchanged
- **AND** no caller-visible function SHALL disappear.
