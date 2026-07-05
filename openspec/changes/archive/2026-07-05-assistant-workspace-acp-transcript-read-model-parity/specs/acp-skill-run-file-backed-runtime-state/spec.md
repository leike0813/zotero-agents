## MODIFIED Requirements

### Requirement: Selected ACP Skills transcript snapshots are paged

ACP Skills panel snapshots SHALL expose selected run transcript content only
through bounded UI-visible transcript page DTOs. The selected run metadata
projection SHALL NOT contain a full `transcriptItems` array.

#### Scenario: Initial selected snapshot carries bounded tail page

- **GIVEN** a selected ACP Skills run has more UI-visible transcript items than
  the default page size
- **WHEN** the host builds the ACP Skills panel snapshot without an explicit
  transcript cursor
- **THEN** the snapshot SHALL contain `selectedTranscriptPage.items` with no
  more than the default page size
- **AND** the snapshot SHALL include `cursor`, `prevCursor`, `nextCursor`,
  `total`, `eventSeq`, and `transcriptRevision`
- **AND** `selectedRun` SHALL NOT contain `transcriptItems`.

#### Scenario: ACP Skills selected page respects streaming render preference

- **GIVEN** a selected ACP Skills run has streaming message or thought rows in
  its canonical transcript mirror
- **AND** Assistant Workspace streaming render is disabled
- **WHEN** the host builds or reloads the selected transcript page
- **THEN** the selected page SHALL omit those streaming rows
- **AND** structural rows such as tool calls, status, plan, and permission rows
  SHALL remain eligible for display.

#### Scenario: ACP Skills transcript boundary reveals completed text

- **GIVEN** Assistant Workspace streaming render is disabled
- **AND** a selected ACP Skills run has hidden streaming text
- **WHEN** a transcript boundary marks that text complete
- **THEN** the next selected transcript page SHALL include the completed text.
