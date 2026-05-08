# assistant-sidebar-ui Delta

## ADDED Requirements

### Requirement: Managed Details drawer governance

Assistant managed panels SHALL render Details drawers through the shared Assistant panel renderer.

Details drawers SHALL use a fixed header plus scrollable body layout so the header remains visible and the details body can scroll independently.

Details sections SHALL support card-like rendering with optional summary text and collapsible state.

Diagnostics, logs, raw JSON, result payloads, and revision trails SHOULD be collapsed by default unless they are short metadata summaries.

#### Scenario: Details drawer remains scrollable

- **Given** a managed Assistant panel has many Details sections or long code entries
- **When** the Details drawer is opened
- **Then** the drawer header remains visible
- **And** the details body is scrollable.

#### Scenario: Heavy diagnostics are collapsed

- **Given** a Details section represents diagnostics, logs, result JSON, or revision history
- **When** the Details drawer is rendered
- **Then** the section can be collapsed
- **And** it is collapsed by default unless the panel explicitly marks it open.

### Requirement: Details action placement

Diagnostic, export, and artifact actions SHALL be available inside the Details drawer.

Backend management actions SHALL be exposed through the outer panel toolbar and SHALL NOT be rendered inside the Details drawer.

ACP Chat, ACP Skills, and SkillRunner SHALL all expose a backend-management toolbar action when rendered by the unified Assistant shell.

#### Scenario: Backend management stays outside Details

- **Given** ACP Chat renders toolbar and Details actions
- **When** the Details drawer is opened
- **Then** `open-backend-manager` is not rendered as a Details action
- **And** the toolbar still exposes backend management.

#### Scenario: All panels expose backend management in the toolbar

- **Given** ACP Chat, ACP Skills, and SkillRunner are rendered in the unified Assistant shell
- **When** their toolbar actions are projected
- **Then** each panel exposes `open-backend-manager` from the toolbar.
