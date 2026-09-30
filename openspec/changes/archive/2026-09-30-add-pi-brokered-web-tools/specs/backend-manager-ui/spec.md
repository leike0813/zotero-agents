## ADDED Requirements

### Requirement: Built-in Agent page manages explicit Web source order

The page SHALL expose enable/disable, accessible ordering, endpoint/model/credential bindings, applicable local/code-execution approval, and user-initiated request-bound tests. It SHALL warn that enabled optional sources may incur account charges. Saved sources SHALL contain no secrets or test response and SHALL NOT change Backend Profiles or connect implicitly.

#### Scenario: Save and test are separate
- **WHEN** a user saves sources and explicitly tests one
- **THEN** only the test performs network activity and its safe result matches requestId
