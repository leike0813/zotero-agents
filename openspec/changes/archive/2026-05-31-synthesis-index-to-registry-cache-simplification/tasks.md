## 1. Change Artifacts

- [x] 1.1 Create the OpenSpec proposal describing why Index should be narrowed to a registry/cache role.
- [x] 1.2 Create the design document with target semantics, non-goals, and migration constraints.
- [x] 1.3 Create the capability spec for the registry cache simplification contract.

## 2. Architecture Documentation

- [x] 2.1 Update the Synthesis domain map and diagrams to use Paper Registry Cache naming and remove Index foundation semantics.
- [x] 2.2 Update domain governance, action boundaries, state catalog, trigger map, rebuild contracts, and UI governance to describe registry/graph cache scope.
- [x] 2.3 Update freshness/coverage/discovery wording so topic source checks and discovery remain explicit or digest-apply-time work, not registry cache rebuild effects.

## 3. Engineering Contracts

- [x] 3.1 Update event contracts and event YAML so historical `index.*` names are documented as registry/cache maintenance identifiers.
- [x] 3.2 Update runbooks, sequences, recovery, and concurrency documents so full rebuild means registry/graph cache rebuild.
- [x] 3.3 Add or update invariants that prevent registry cache work from becoming a global Synthesis source of truth.

## 4. Validation

- [x] 4.1 Run OpenSpec validation for the change.
- [x] 4.2 Run formatting checks for touched OpenSpec and Synthesis documentation files.
- [x] 4.3 Search for contradictory old wording that still describes Index as the global Synthesis foundation or Topic driver.
