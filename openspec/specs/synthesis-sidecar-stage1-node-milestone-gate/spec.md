# synthesis-sidecar-stage1-node-milestone-gate Specification

## Purpose
Defines the synthesis sidecar stage1 node milestone gate capability for the Synthesis plugin, specifying its service boundary, integration contracts, and runtime behavior.

## Requirements

### Requirement: Stage 1 Node milestone inventory SHALL be complete


The Node test runner SHALL expose one named Synthesis Stage 1 milestone that
contains exactly one Synthesis Core test for every numeric prefix from 175
through 217 inclusive.

#### Scenario: Complete inventory is selected

- **WHEN** every Core number from 175 through 217 has exactly one Synthesis
  test file
- **THEN** the runner selects all 43 files for the milestone

#### Scenario: Inventory is incomplete or ambiguous

- **WHEN** a required number is missing, duplicated, or assigned to a
  non-Synthesis test file
- **THEN** the runner fails before executing the milestone

### Requirement: Load-sensitive milestone work SHALL remain blocking


The milestone runner SHALL execute Core 202 in an isolated child process while
retaining its unchanged behavior and failure status as part of the cumulative
milestone result.

#### Scenario: All milestone segments pass

- **WHEN** the tests before Core 202, Core 202 itself, and the tests after Core
  202 all pass
- **THEN** the milestone command exits successfully

#### Scenario: An isolated segment fails

- **WHEN** Core 202 or another milestone segment fails
- **THEN** the milestone command exits unsuccessfully and identifies the
  failing segment

### Requirement: PR and release gates SHALL block on the Node milestone


The shared CI gate orchestrator SHALL run the same Synthesis Stage 1 Node
milestone once for both PR and release gates before their gate-specific Zotero
suite.

#### Scenario: PR gate runs

- **WHEN** the PR gate plan is executed
- **THEN** it runs governance, SSOT invariants, the Node milestone, and the
  Zotero lite suite in that order

#### Scenario: Release gate runs

- **WHEN** the release gate plan is executed
- **THEN** it runs governance, SSOT invariants, the Node milestone, and the
  Zotero full suite in that order

#### Scenario: Milestone fails

- **WHEN** the Node milestone exits unsuccessfully
- **THEN** the gate stops before executing its Zotero suite
