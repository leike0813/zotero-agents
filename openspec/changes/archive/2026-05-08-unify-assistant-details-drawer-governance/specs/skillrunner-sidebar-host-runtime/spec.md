# skillrunner-sidebar-host-runtime Delta

## ADDED Requirements

### Requirement: SkillRunner Details metadata boundary

SkillRunner Details SHALL show current run/task metadata and compact diagnostics summaries.

SkillRunner Details SHALL expose a `Copy ID` action for the current run when a request id is available.

SkillRunner Details SHALL NOT render full conversation history, full transcript message lists, or full raw envelope dumps in the visible drawer body.

Full SkillRunner diagnostics MAY remain available through diagnostic copy/export actions.

#### Scenario: SkillRunner Details omits full conversation history

- **Given** a SkillRunner run has many chat messages
- **When** the Details drawer is rendered
- **Then** the drawer shows run metadata and compact summaries
- **And** it does not render the full message list or full raw envelope dump.
