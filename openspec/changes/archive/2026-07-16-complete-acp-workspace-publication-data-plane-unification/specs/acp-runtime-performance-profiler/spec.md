## ADDED Requirements

### Requirement: Profiler vocabulary matches v3 publication semantics
Profiler events SHALL use bounded labels derived from v3 owner source, publication kind, form, cause, and materialization source. Profiler SHALL NOT infer form or source from surface-specific DTO fields.

#### Scenario: Skills transcript delta posts
- **WHEN** Skills posts a steady transcript delta
- **THEN** profiler records source acp-skills, kind transcript, form delta, cause steady-state, and materialization source region.

### Requirement: Forbidden materialization is measured at builder entry
Profiler SHALL count transcript-page, frontend-snapshot, and panel-snapshot materialization at their actual builder entry points so steady transcript/count/progress acceptance can require zero.

#### Scenario: A forbidden builder is called
- **WHEN** a steady publication invokes it before the coordinator
- **THEN** the formal report records the violation even if the final wire payload is a delta.
