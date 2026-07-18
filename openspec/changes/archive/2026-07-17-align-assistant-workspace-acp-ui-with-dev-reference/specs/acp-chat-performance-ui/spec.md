## ADDED Requirements

### Requirement: Chat UI restoration remains page-first and mutation proportional

The Assistant Workspace SHALL keep restored Chat selectors, banner actions,
permissions, composer, navigation, and details free of full panel/session
snapshots and SHALL NOT make details or full-mirror hydration a prerequisite
for the first indexed transcript page.
Steady transcript work SHALL remain proportional to the visible mutation.

#### Scenario: A cold Chat session is selected

- **WHEN** the selected conversation has no cold full-mirror cache entry
- **THEN** Chat publishes owner-first loading and renders the indexed page when ready
- **AND** details and full-mirror hydration proceed independently without rebuilding chrome.
