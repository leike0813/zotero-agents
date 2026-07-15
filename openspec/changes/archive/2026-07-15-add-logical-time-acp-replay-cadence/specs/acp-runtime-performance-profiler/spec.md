## MODIFIED Requirements

### Requirement: Measurement coverage identifies synthetic timing

Profiler coverage SHALL distinguish captured semantic/runtime evidence from timing evidence produced under a logical clock. Logical replay SHALL retain measured values for diagnostics but SHALL mark wall-clock-dependent timing families synthetic and non-comparable without downgrading correctly captured semantic counters.

#### Scenario: Logical replay completes without contamination
- **WHEN** logical replay processes every event and captures all replay-owned timers
- **THEN** execution and semantic measurement SHALL be complete
- **AND** wall-clock-dependent timing SHALL be reported as synthetic rather than as recorded-equivalent evidence.

#### Scenario: Logical timer ownership is contaminated
- **WHEN** Replay cannot prove exclusive ownership of a timer
- **THEN** execution MAY remain complete, measurement SHALL be incomplete, and the structured contamination reason SHALL appear in JSON and Markdown.
