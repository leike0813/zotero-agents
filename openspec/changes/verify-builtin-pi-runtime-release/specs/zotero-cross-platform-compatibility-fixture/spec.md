## ADDED Requirements

### Requirement: Pi candidate exercises formal install and baseline upgrade

Pi acceptance SHALL reuse the normative compatibility manifest and full runner for five behavior groups: streaming/tool/durable second turn, interruption/late rejection, Auto seal/apply/ack, Interactive waiting/permission/suspension/continuation, and real restart safe recovery versus unknown holds/no replay. Formal installed production XPI SHALL prove Conversation and Auto chains through public paths with only external Provider replaced. Fresh profiles and upgrades SHALL be controlled and isolated. The upgrade baseline SHALL be v0.9.0 built from fixed dev commit `9218f30899e47d6e9b852dec978be81b1f802c2f`, with pinned XPI digest, and SHALL create ACP/SkillRunner configuration/history using the baseline plugin before candidate installation and verify their preservation.

#### Scenario: Installed plugin is replaced by a test import

- **WHEN** a packaged chain swaps production modules rather than just its external Provider
- **THEN** it cannot satisfy formal XPI evidence

#### Scenario: Upgrade preserves existing owners

- **WHEN** the candidate replaces the fixed baseline in a copied controlled profile
- **THEN** old ACP/SkillRunner entries and configuration remain available and Pi initial setup succeeds
