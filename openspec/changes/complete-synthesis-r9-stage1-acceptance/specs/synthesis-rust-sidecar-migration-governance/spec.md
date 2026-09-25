## ADDED Requirements

### Requirement: Post-retirement acceptance SHALL bind one immutable candidate

Final R9 and Stage-1 acceptance SHALL join the source commit, matching trusted
prebuild v4 and verification v2 results, Rust toolchain, Cargo lock identity,
seven native bundle fingerprints, universal-XPI hash, workflow identity,
current blocking compatibility matrix, and every required result to one
immutable candidate. Environment receipts SHALL prove the XPI bytes installed
and selected bundle identity; a source-matched but restaged XPI is insufficient.
Missing, mixed-source, stale, inferred, filtered, or manually substituted
evidence MUST leave acceptance incomplete. A release-set or complete release
receipt MUST NOT be required for this non-publishing acceptance decision.

#### Scenario: One result belongs to another source identity
- **WHEN** an otherwise complete receipt set contains a target, XPI, or
  real-machine result from another identity or unverified XPI bytes
- **THEN** the acceptance change remains incomplete
- **AND** the mismatched result is reported rather than normalized away

#### Scenario: Every required result passes
- **WHEN** the full post-retirement matrix passes for one immutable candidate
- **THEN** R9 and Stage 1 may be declared complete
- **AND** no release, feed, signing, or Gitee action is implied
