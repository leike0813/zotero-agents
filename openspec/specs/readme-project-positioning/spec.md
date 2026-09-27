# readme-project-positioning Specification

## Purpose
TBD - created by archiving change revamp-readme-bilingual-positioning. Update Purpose after archive.
## Requirements
### Requirement: Root README SHALL Describe Current Zotero-Skills Positioning Instead of Template Boilerplate
The root `README.md` MUST describe the current project architecture, integration boundary, and usage context, replacing template-oriented boilerplate sections.

#### Scenario: Reader opens repository landing page
- **WHEN** a user opens the repository root page
- **THEN** `README.md` SHALL present project-specific content for Zotero-Skills
- **AND** template demo sections unrelated to this project SHALL NOT dominate the document

### Requirement: Root README SHALL Be English-First With Chinese Documentation Entry
The root `README.md` MUST use English as the primary language and MUST provide a clear link to Chinese documentation.

#### Scenario: Reader needs Chinese documentation
- **WHEN** a user reads the root README
- **THEN** README SHALL include a visible link to `README-zhCN.md`

### Requirement: README SHALL Explain Pluggable Workflow Architecture and Benefits
The README MUST explain that the plugin uses a pluggable workflow architecture and state why this is advantageous.

#### Scenario: Reader evaluates architecture
- **WHEN** a user scans architecture sections
- **THEN** README SHALL describe the pluggable workflow model
- **AND** README SHALL state practical benefits such as extensibility and separation of core shell from business workflows

### Requirement: README SHALL State Skill-Runner Dependency for Agent Skills Execution
The README MUST explicitly state that Agent Skills execution requires integration with Skill-Runner backend.

#### Scenario: Reader prepares deployment
- **WHEN** a user checks runtime dependencies
- **THEN** README SHALL state that Agent Skills invocation depends on Skill-Runner backend availability/configuration

### Requirement: README SHALL Describe Subscription-Quota Cost Advantage
The README MUST describe the rationale that this architecture can leverage subscription quotas (for example OpenAI/Gemini subscription allowances) and reduce direct token-billed API calls in common usage.

#### Scenario: Reader evaluates cost model
- **WHEN** a user reads value proposition section
- **THEN** README SHALL include the subscription-quota/cost-control explanation

### Requirement: README SHALL Preserve Template Origin Attribution
The README MUST include explicit attribution that this project was generated from Zotero Plugin Template.

#### Scenario: Reader checks project origin
- **WHEN** a user reads project background
- **THEN** README SHALL contain a clear statement of Zotero Plugin Template origin
