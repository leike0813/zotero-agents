## ADDED Requirements

### Requirement: Harness documentation distinguishes benchmark and realtime debugging
Active documentation SHALL distinguish the old fixture/gold-label benchmark
harness from the new realtime Synthesis Index algorithm harness.

#### Scenario: Developer chooses a harness
- **WHEN** a developer wants to inspect current Zotero and plugin database state
  and run cluster dedupe experiments
- **THEN** documentation SHALL direct them to `tools/synthesis-index-harness`.

#### Scenario: Cluster classifier is documented
- **WHEN** active documentation describes contained-title dedupe
- **THEN** it SHALL describe eligibility filtering, structured bibliographic
  suffix classification, semantic extension risk, and the prohibition on using
  an ever-growing venue token list as the primary classifier.
