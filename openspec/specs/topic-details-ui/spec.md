## Requirements
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
### Requirement: Topic details SHALL render review outline and coverage without duplication





Topic Details SHALL interpret the current review outline payload shape without
flattening arbitrary objects into generic steps.

#### Scenario: Review outline is grouped

- **WHEN** `review_outline` contains introduction, related work, body sections,
  sections, outline, or review sections
- **THEN** Topic Details SHALL render deterministic groups for introduction,
  related work, main sections, and other outline notes.

#### Scenario: Coverage content is deduplicated

- **WHEN** coverage, external literature, gaps, and collection suggestions
  contain repeated text
- **THEN** Topic Details SHALL render each distinct coverage idea once.
### Requirement: Topic details overview summary



The Overview page SHALL render topic boundary from `topic.scope_boundary` and
review-writing guidance from `review_outline`.

#### Scenario: Overview renders review strategy blueprint

- **WHEN** a topic detail contains `review_outline.topic_importance` and
  `review_outline.writing_strategies`
- **THEN** Overview renders topic importance
- **AND** it renders each writing strategy with thesis, strategy, section plan,
  best-for, risks, and source chips
- **AND** Overview does not render a positioning dashboard
### Requirement: Future directions page




Topic Details SHALL expose future research directions as a dedicated page.

#### Scenario: Future directions render separately from coverage

- **WHEN** a topic artifact contains `future_directions`
- **THEN** Topic Details tabs include `Future Directions`
- **AND** the Future Directions page renders limitation, future direction,
  rationale, direction type, and source chips
- **AND** the Coverage page does not render future directions.
### Requirement: Debate body text




Debate cards SHALL render the current judgment when available.

#### Scenario: Debate uses current judgment

- **WHEN** a debate row contains `current_judgment`
- **THEN** Topic Details renders that text as the debate body.
### Requirement: Coverage display


Topic Details SHALL render coverage from the minimal coverage section and SHALL
not display duplicate coverage summary blocks.

#### Scenario: Coverage page uses current fields

- **WHEN** a topic detail contains the minimal coverage section
- **THEN** the Coverage page displays verdict, reason, caveats, external context
  summary, and collection directions
- **AND** it does not render route/claim/timeline coverage summary cards,
  reliability blocks, or representative references
