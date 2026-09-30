## ADDED Requirements

### Requirement: Final Workspace lane and source registry

Workspace SHALL use one browser-safe descriptor registry for exactly two lanes and five sources: Conversations with Pi Conversations and ACP Chat, and Skill Runs with Pi Skill Runs, ACP Skills and SkillRunner. New windows SHALL default to Conversations / Zotero Agent; lane/source state SHALL remain window-local. Pi Skill Runs SHALL remain navigation-only unavailable until its adapter exists. Counts, attention, labels, owner kinds, supported actions and new-item behavior SHALL follow the registry.

#### Scenario: Two windows choose different sources

- **WHEN** one window selects External Agent and another selects Zotero Agent
- **THEN** their lane/source selections remain independent and existing ACP/SkillRunner behavior remains available.

### Requirement: Pi uses the shared Workspace publication plane

Pi Conversations SHALL project source-neutral owner navigation, transcript pages/mutations, controls, composer/resources, permission, details, count and usage through the same publication and region components. Selected owner transitions SHALL publish empty/loading before indexed reads. Transcript-only updates SHALL preserve all non-transcript managed region DOM identities. UI DTOs SHALL contain no Pi SDK or ACP transport types.

#### Scenario: Pi text streams while Details is open

- **WHEN** text grows on the selected Pi owner
- **THEN** only transcript content changes and toolbar, banner, plan, hint, reply and all drawers retain DOM identity.
