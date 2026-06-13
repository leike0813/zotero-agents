## ADDED Requirements

### Requirement: Readonly harness visual capture SHALL wait for mounted content
Readonly harness visual verification tooling SHALL wait for target UI roots
and populated DOM content before capturing screenshots.

#### Scenario: Dashboard capture waits for workflow cards

- **WHEN** a harness screenshot task captures the Dashboard home surface
- **THEN** it SHALL wait until the Dashboard frame has mounted and workflow
  card content is present
- **AND** it SHALL NOT rely only on a fixed sleep after navigation.

#### Scenario: Synthesis capture waits for detail content

- **WHEN** a harness screenshot task captures Synthesis Topic Detail
- **THEN** it SHALL wait until the Workbench frame has mounted and detail
  content for the selected topic is populated
- **AND** slow readonly database or bundle initialization SHALL result in a
  bounded readiness wait rather than an immediate blank capture.

#### Scenario: Capture artifacts remain local by default

- **WHEN** visual verification produces screenshots, browser profile
  directories, harness mock data, or copied SQLite files
- **THEN** those artifacts SHALL remain outside tracked source by default
- **AND** source changes SHALL be limited to reusable harness code, tests, or
  documented fixtures.
