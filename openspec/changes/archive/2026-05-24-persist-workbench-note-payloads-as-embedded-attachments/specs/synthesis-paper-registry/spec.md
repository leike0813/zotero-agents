# synthesis-paper-registry Delta

## ADDED Requirements

### Requirement: Paper registry SHALL discover generated paper artifacts

The paper registry and artifact readers MUST discover generated workbench artifacts from both legacy HTML payload blocks and embedded payload attachments.

#### Scenario: Registry scans normalized notes
- **WHEN** a paper has digest, references, or citation-analysis notes whose payloads are stored as embedded payload attachments
- **THEN** the registry SHALL mark the corresponding artifacts as available
- **AND** artifact hashes SHALL be computed from the decoded payload content.

#### Scenario: Artifact export reads normalized notes
- **WHEN** `synthesis.read_paper_artifacts` or filtered artifact export reads a paper with normalized generated notes
- **THEN** it SHALL return the decoded payloads and markdown text as available artifacts.
