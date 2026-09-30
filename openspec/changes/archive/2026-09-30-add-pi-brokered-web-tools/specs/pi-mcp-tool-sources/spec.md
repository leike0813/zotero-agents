## ADDED Requirements

### Requirement: Curated Search uses the shared network boundary

HTTP MCP SHALL use the shared Web URL/DNS/peer/credential policy. The aggregate search chain SHALL preselect only project-curated web_search_exa, tavily-search and brave_web_search descriptors. Brave stdio SHALL require explicit credential and code-execution approval with an exact installed package version. Arbitrary reviewed MCP tools SHALL remain available only through the existing proxy/direct tools.

The curated connection SHALL discover the selected descriptor and validate the project-owned argument mapping. Its name, description and input schema SHALL match the turn-frozen reviewed digest before search dispatch. Exa SHALL ship a project-reviewed hosted digest; an explicit source test SHALL expose only a safe digest for user approval. Descriptor changes SHALL stop the search chain until reviewed. Brave SHALL read the installed package manifest and require the exact package name/version before launching the configured entry.

#### Scenario: Hosted descriptor changes
- **WHEN** a discovered descriptor differs from its reviewed digest
- **THEN** no search dispatch occurs and the chain stops with source_descriptor_changed

#### Scenario: Arbitrary MCP search is configured
- **WHEN** a user reviews another tool named search
- **THEN** it does not enter the aggregate Web Search chain
