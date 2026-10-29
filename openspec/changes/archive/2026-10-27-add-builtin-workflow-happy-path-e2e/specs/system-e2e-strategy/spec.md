# Spec Delta

## ADDED Requirements

### Requirement: WF-01 SHALL cover production workflow happy paths

The WF family SHALL own WF-01, a serial production workflow happy path through real Zotero selection, submission, provider execution, apply, and public reads. All 20 non-debug workflows SHALL be covered. Synthesis SHALL use the current-source sidecar. Offline peers SHALL replace only external HTTP and ACP systems; live mode SHALL use real backends.

#### Scenario: Acquisition and analysis compose

- **WHEN** tag bootstrap, MinerU conversion, analysis, regulation, reading, translation, and explanation workflows run
- **THEN** their declared artifacts and generated images are readable, correctly owned, and in the requested language
- **AND** deep reading with differing source and target languages actually includes translation

#### Scenario: Topic creation and update compose

- **WHEN** a seed creates T1, a planner produces a Planned Topic, and that Planned Topic is materialized as T2
- **THEN** both creation paths preserve valid topic identities and source relations
- **WHEN** two additional related papers included in T1 with missing analysis artifacts receive their first analysis
- **THEN** public topic reads show T1 stale before update and fresh after successful update of the same topic

#### Scenario: Curation and research outputs complete

- **WHEN** tag audit, collection collection, metadata curation, literature search ingest, research bundle export, and manuscript framing complete
- **THEN** public results show the intended audit, membership, metadata, ingest, and readable output artifacts

#### Scenario: Portable data round trips

- **WHEN** literature bundles and notes are exported and imported into targets requiring restoration
- **THEN** their supported structure, assets, and ownership are restored without duplicate generated notes

### Requirement: Live workflow evidence SHALL admit successful results only

Live capture SHALL stop on execution, apply, final-contract, or business-flow failure. Review SHALL cover public states, artifact structure, ownership, readable resources, and workflow composition, excluding agent content quality. Failed results SHALL remain diagnostics, never expected fixtures. Workflow decisions SHALL follow the user's actual answer or explicit delegation to the operator. Raw sources and credentials SHALL remain private; committed fixtures SHALL be synthetic.

#### Scenario: Generated prose varies

- **WHEN** an agent produces differing prose or minor factual inaccuracies while execution, final artifact contracts, apply, and required business transitions succeed
- **THEN** the workflow remains eligible as successful business-flow evidence
- **AND** fixtures assert structural contracts and observable business state rather than exact prose or factual quality

#### Scenario: Capture encounters an error

- **WHEN** a workflow fails or its observable result violates its contract
- **THEN** later workflow steps are not invoked and diagnostics are retained
- **AND** no successful golden outcome is recorded for that step and no automatic retry hides the failure

#### Scenario: Workflow requires a decision

- **WHEN** a live workflow requests confirmation of a search plan, ingest scope, or writing stage
- **THEN** capture records the actual question and answers within explicit user delegation, or waits for the user's answer when no delegation covers that decision
- **AND** offline regression uses synthetic versions of reviewed successful interactions

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
- **AND** this addition does not authorize CI promotion or publication
