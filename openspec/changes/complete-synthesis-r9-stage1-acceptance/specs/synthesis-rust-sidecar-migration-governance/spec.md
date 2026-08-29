## MODIFIED Requirements

### Requirement: Destructive retirement SHALL require accepted pre-deletion evidence

Plugin legacy and Node oracle deletion SHALL NOT begin while any baseline
disposition is unresolved, any production route relies on placeholder or wrong
behavior, or the accepted pre-deletion seven-platform candidate and agreed
scale gates are incomplete. Final universal-XPI, upgrade, failure-injection,
and Zotero 7/9 real-machine acceptance MAY follow source retirement in the
separate `complete-synthesis-r9-stage1-acceptance` change, but MUST remain
explicitly pending and MUST block any R9 or Stage-1 completion claim.

#### Scenario: Existing local suites pass without pre-deletion baseline parity
- **WHEN** contract/package/unit suites pass but fixed-baseline, real-route,
  scale, or accepted pre-deletion candidate evidence is incomplete
- **THEN** the migration remains pre-retirement
- **AND** both destructive retirement changes remain blocked

#### Scenario: Pre-deletion restoration gates pass
- **WHEN** every disposition and production operation has accepted behavior
  evidence and the agreed scale plus seven-target candidate gates pass for one
  source identity
- **THEN** retirement implementation may proceed
- **AND** final R9/Stage-1 acceptance and release remain separately gated

## ADDED Requirements

### Requirement: Post-retirement acceptance SHALL bind one immutable candidate

Final R9 and Stage-1 acceptance SHALL bind the source commit, Rust toolchain,
Cargo lock identity, seven native fingerprints, universal-XPI hash, workflow
identity, environment matrix, and every result to one immutable candidate.
Missing, mixed-source, stale, inferred, filtered, or manually substituted
evidence MUST leave acceptance incomplete.

#### Scenario: One result belongs to another source identity
- **WHEN** an otherwise complete receipt set contains a target, XPI, or
  real-machine result from another identity
- **THEN** the acceptance change remains incomplete
- **AND** the mismatched result is reported rather than normalized away

#### Scenario: Every required result passes
- **WHEN** the full post-retirement matrix passes for one immutable candidate
- **THEN** R9 and Stage 1 may be declared complete
- **AND** no release, feed, signing, or Gitee action is implied
