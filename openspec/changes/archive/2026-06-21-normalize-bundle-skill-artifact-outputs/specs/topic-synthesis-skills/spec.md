## MODIFIED Requirements

### Requirement: Topic synthesis split skills SHALL materialize runtime-owned outputs

Topic synthesis split skills SHALL use runtime gates to materialize handoff and final result files rather than asking the agent to hand-write runtime-owned artifacts.

#### Scenario: Finalize produces final topic synthesis output

- **WHEN** finalize receives the core handoff and completes its payload stages
- **THEN** runtime SHALL materialize `result/sections/*.json`,
  `result/topic-analysis.json`, `result/topic-synthesis-artifacts.json`, and
  `result/final-output.candidate.json`
- **AND** the final output SHALL be `kind: "topic_synthesis"`, not a handoff
- **AND** the final output SHALL expose `artifact_manifest_path`
- **AND** `analysis_manifest_path`, section paths, and sidecar paths SHALL be listed in the flat artifact manifest instead of being required as top-level final output fields.
