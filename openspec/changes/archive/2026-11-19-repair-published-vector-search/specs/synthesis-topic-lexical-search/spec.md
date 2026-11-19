## MODIFIED Requirements

### Requirement: Topic search SHALL query canonical Topic text

`topics.search` SHALL accept a required non-empty string query and search canonical Topics in the current Synthesis data root. It SHALL return one result per Topic, with Topic identity, matched canonical sections, and a concise match explanation.

#### Scenario: Topic content matches the query

- **WHEN** a query matches one or more searchable text fields in a canonical Topic
- **THEN** the result contains that Topic once, identifies each matching section, and explains the actual match without exposing a score or block ID

#### Scenario: Query is empty

- **WHEN** query is empty or contains only whitespace
- **THEN** the operation fails as an invalid request and does not return an empty search result

#### Scenario: Topic has several matching sections

- **WHEN** one Topic matches in several sections or fields
- **THEN** those matches are aggregated into its single Topic result and do not consume separate Topic result slots

#### Scenario: A semantic Topic lies outside the lexical scan window

- **WHEN** the published index matches a Topic outside the lexical prefix in a requested canonical section
- **THEN** search admits the semantic match after verifying the current Topic identity, content version and range, and reports the canonical section and semantic match reason

#### Scenario: Topic content is stored in a structured section

- **WHEN** a Topic has searchable structured section text and no separate Markdown asset
- **THEN** index maintenance includes that text and semantic retrieval can verify the corresponding excerpt against the same section
