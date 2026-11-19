## MODIFIED Requirements

### Requirement: Lexical matching SHALL normalize multilingual text consistently
The lexical kernel SHALL apply deterministic Unicode normalization and case normalization, and SHALL tokenize or match phrase units using boundaries suitable for the scripts present in the text.

#### Scenario: Text differs only by Unicode form or case
- **WHEN** a query and source contain canonically equivalent text or case variants
- **THEN** the kernel compares them under the same normalized matching rules

#### Scenario: Text uses scripts without whitespace word boundaries
- **WHEN** a query or source uses a script whose words are not reliably separated by spaces
- **THEN** matching uses script-aware lexical units and does not require ASCII or whitespace-only token boundaries

#### Scenario: Han characters occur separately

- **WHEN** a multi-character Han query shares individual characters with a passage but no adjacent query pair
- **THEN** those characters alone produce no lexical hit
- **AND** a query consisting of one Han character remains searchable

#### Scenario: An ordinary query matches only a tag namespace

- **WHEN** the tag is `topic:trolley` and the only query unit present is the namespace `topic`
- **THEN** that tag supplies no lexical evidence
- **AND** both its value `trolley` and the explicitly qualified tag remain searchable
