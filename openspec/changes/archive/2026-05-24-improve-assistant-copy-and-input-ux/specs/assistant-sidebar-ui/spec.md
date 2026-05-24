## MODIFIED Requirements

### Requirement: Assistant Sidebar Panels SHALL Share Stable Composer Semantics

The shared assistant panel renderer MUST render normal send state, busy
interrupt state, and session-local reply history consistently across ACP Chat,
ACP Skills, and SkillRunner panels.

#### Scenario: Normal composer is ready to send

- **WHEN** a panel reply model is enabled and not busy
- **THEN** the text input SHALL be enabled
- **AND** the submit button SHALL use primary styling and send semantics.

#### Scenario: Busy composer interrupts without accepting text

- **WHEN** a panel reply model represents an active agent turn
- **THEN** the text input SHALL be disabled
- **AND** the button SHALL remain enabled with danger styling
- **AND** clicking the button SHALL emit the configured interrupt action.

#### Scenario: User recalls reply history

- **WHEN** the shared reply textarea has previously sent non-empty messages in
  the current page session
- **AND** the textarea is enabled
- **THEN** ArrowUp at the first line SHALL recall older messages
- **AND** ArrowDown at the last line SHALL recall newer messages or restore the
  draft that was present before history navigation.

## ADDED Requirements

### Requirement: Assistant transcript and detail content SHALL be copy-friendly

Assistant copy surfaces SHALL allow normal text selection and copying across
conversation, code, details, permission preview, and log-like content.

#### Scenario: User selects Assistant transcript text

- **WHEN** the user drags across transcript, markdown, details, code, or
  permission preview text
- **THEN** the text SHALL be selectable
- **AND** control-only elements such as buttons, selectors, tabs, and disclosure
  summaries MAY retain non-selection interaction behavior.

### Requirement: Assistant markdown code fences SHALL provide copy handles

Markdown fenced code blocks rendered in Assistant transcripts SHALL expose a
small copy handle.

#### Scenario: User copies a fenced code block

- **WHEN** a transcript message or process item renders a markdown fenced code
  block
- **THEN** the code block SHALL expose a keyboard-focusable copy button
- **AND** activating the button SHALL copy the code text without including the
  copy button label
- **AND** inline code SHALL NOT receive a copy button.
