# acp-status-visual-feedback Specification

## Purpose
TBD - created by archiving change improve-acp-status-visual-feedback. Update Purpose after archive.
## Requirements
### Requirement: Connection Status Tone

ACP chat SHALL visually distinguish connection states using the existing `snapshot.status`.

#### Scenario: Connection pill tone is derived from status

- Given an ACP snapshot has a connection status
- When ACP chat renders the status pill
- Then the pill includes a status tone class
- And connected, connecting, idle, and error states are visually distinct

### Requirement: Plan Status Icons

ACP chat SHALL render plan entry status with an icon and tone derived from the existing plan entry status text.

#### Scenario: Active plan entries display status icons

- Given ACP chat renders an active plan
- When an entry is pending, running, completed, failed, cancelled, or skipped
- Then the entry status includes a matching icon and tone
- And running entries use a CSS spinner unless reduced motion is requested

### Requirement: Tool State LEDs

ACP chat SHALL render compact LED indicators for tool rows and tool activity drawer rows.

#### Scenario: Tool state is visible without reading the summary

- Given ACP chat renders tool activity
- When a tool is pending, in progress, completed, or failed
- Then the row includes a LED indicator with the matching tone
- And activity drawer summary state prioritizes failed over running over pending over completed


### Requirement: Connect action SHALL immediately display bounded busy state

ACP Chat SHALL disable its connect action and show connecting feedback before asynchronous connection preparation. All startup phases SHALL retain busy feedback; completion, authentication requirement and failure SHALL end it. Repeated connection requests for the same owner SHALL share pending work while different owners remain independent.

#### Scenario: Connection preparation is pending
- **WHEN** the user initiates connection and preparation has not completed
- **THEN** the action SHALL be disabled with spinner and busy accessibility state, and a repeated request SHALL not start another adapter.

#### Scenario: Connection fails
- **WHEN** connection preparation fails
- **THEN** the action SHALL leave busy state and expose the error through the existing diagnostics path.
