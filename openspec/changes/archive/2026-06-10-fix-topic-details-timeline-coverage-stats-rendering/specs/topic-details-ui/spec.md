## MODIFIED Requirements

### Requirement: Topic details SHALL render structured timeline and coverage content

Topic Details SHALL render the current split topic artifact as readable user
content without exposing sparse or unsupported internal statistics panels.

#### Scenario: Timeline uses source paper years

- **WHEN** a topic detail DTO contains `source_papers` with valid years
- **THEN** the timeline SHALL render one paper pin per dated source paper
- **AND** the axis SHALL span from the minimum paper year to the maximum paper
  year plus one.

#### Scenario: Timeline milestone events are grouped

- **WHEN** `timeline_events.events` contains multiple events for the same year
- **THEN** the timeline SHALL render one milestone pin for that year
- **AND** its hover or focus card SHALL list the grouped events.

#### Scenario: Coverage shows caveat notes and compact stats

- **WHEN** coverage caveats include `note`
- **THEN** Topic Details SHALL show the note as the caveat body.
- **WHEN** statistics are available
- **THEN** Coverage SHALL show paper count, time span, coverage verdict, and
  route count.
- **AND** Topic Details SHALL NOT expose a separate empty Stats tab.
