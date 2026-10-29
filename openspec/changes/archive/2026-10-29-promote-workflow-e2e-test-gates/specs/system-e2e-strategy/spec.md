## MODIFIED Requirements

### Requirement: Workflow source preparation SHALL preserve the original library

Live capture SHALL use a fresh profile under the existing runner. Source metadata and available PDFs SHALL be copied from a quiescent, read-only library. Linked PDFs SHALL become independent stored attachments. Existing derived notes and plugin state SHALL NOT initialize the capture. Missing source PDFs SHALL be inventoried and excluded from the sample.

#### Scenario: Live library is initialized

- **WHEN** capture prepares its profile
- **THEN** all undeleted source literature metadata and available child PDFs are imported without modifying the original library or linked files
- **AND** old analysis notes and backend state are absent

#### Scenario: Live backend identity is selected

- **WHEN** ACP workflows are prepared
- **THEN** OpenCode v2 confirms the exact raw model minimax-cn-coding-plan/MiniMax-M3.1-Flash before a prompt
- **AND** MinerU authentication is read from MINERU_TOKEN without publishing it

#### Scenario: Regression evidence is collected

- **WHEN** WF-01 is accepted
- **THEN** Linux Zotero 10 has live evidence and Linux Zotero 7, 9, and 10 each have offline evidence from fresh profiles
- **AND** independently authorized WF CI gates follow test-suite-gating-strategy without authorizing publication
