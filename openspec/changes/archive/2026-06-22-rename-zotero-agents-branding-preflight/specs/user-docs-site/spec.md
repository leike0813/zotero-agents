## MODIFIED Requirements

### Requirement: Published docs use renamed project identity

The published user docs SHALL use `Zotero Agents` as the product name and
`zotero-agents` as the active repository/site slug.

#### Scenario: Docs links target the renamed repository
- **WHEN** users follow active README or documentation links to releases,
  issues, repository pages, or the docs site
- **THEN** those links target `leike0813/zotero-agents` or the
  `/zotero-agents/` docs base path.

#### Scenario: Historical archives are not rewritten
- **WHEN** archived OpenSpec changes, deprecated docs, or artifact reports
  mention old names
- **THEN** those historical files MAY keep their original text.
