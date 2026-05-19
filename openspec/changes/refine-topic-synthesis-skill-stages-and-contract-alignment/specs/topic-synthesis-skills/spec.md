## ADDED Requirements

### Requirement: Split cross-paper synthesis authoring

Create and update topic synthesis skills SHALL split cross-paper synthesis into
separate gated actions for evidence-map drafting, route/timeline synthesis, core
analytic sections, and external/statistics/report authoring.

#### Scenario: Gate directs route and timeline synthesis

- **WHEN** cross-paper context and evidence map are available
- **THEN** the gate returns a route/timeline synthesis action before final
  section validation
- **AND** the action references the taxonomy/timeline contract reference.

### Requirement: Package-local topic content contract

Create and update topic synthesis skills SHALL include package-local references
derived from the topic synthesis content contract.

#### Scenario: Agent receives targeted references

- **WHEN** the gate asks for a Stage 5 authoring action
- **THEN** its JIT payload lists only the references relevant to that action.

## MODIFIED Requirements

### Requirement: Skill output uses the target structured contract

New create/update topic synthesis outputs SHALL include `taxonomy.summary` and
object-shaped `timeline_events` with `summary` and `events`.

#### Scenario: Runtime rejects old timeline shape

- **WHEN** an agent authors final sections with `timeline_events` as a bare array
- **THEN** the package-local runtime rejects the artifact before final result
  generation
- **AND** the gate continues to point the agent at the route/timeline authoring
  action.
