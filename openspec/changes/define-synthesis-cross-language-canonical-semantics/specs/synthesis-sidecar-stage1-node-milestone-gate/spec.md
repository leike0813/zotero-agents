## MODIFIED Requirements

### Requirement: Stage 1 Node milestone inventory SHALL be complete

The Node test runner SHALL expose one named Synthesis Stage 1 milestone that contains exactly one Synthesis Core test for every numeric prefix from 175 through 218 inclusive.

#### Scenario: Complete inventory is selected

- **WHEN** every Core number from 175 through 218 has exactly one Synthesis test file
- **THEN** the runner selects all 44 files

#### Scenario: Inventory is incomplete or ambiguous

- **WHEN** a required number is missing, duplicated, or assigned to a non-Synthesis test file
- **THEN** the runner fails before executing the milestone.
