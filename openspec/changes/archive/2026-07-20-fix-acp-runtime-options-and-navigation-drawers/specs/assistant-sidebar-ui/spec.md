## ADDED Requirements

### Requirement: Assistant Navigation Drawer Projection Is Source-Aware

The Assistant Workspace MUST derive visible drawer structure from the selected source while preserving the complete canonical owner-navigation catalog.

#### Scenario: ACP Skills drawer is projected

- **WHEN** ACP Skills navigation contains active and completed tasks
- **THEN** the drawer MUST expose active and completed sections
- **AND** each section MUST include only backend groups that contain a card in that section.

#### Scenario: Empty backend is added to canonical navigation

- **WHEN** a backend with no visible cards is added to canonical owner navigation
- **THEN** the visible drawer DTO MUST remain unchanged
- **AND** the drawer managed region MUST preserve its DOM identity.

### Requirement: Drawer Stable Signature Covers Visible Structure

The drawer managed-region signature MUST include every visible structural field and exclude non-visible catalog data.

#### Scenario: Visible section title policy changes

- **WHEN** a visible section changes whether its title is hidden
- **THEN** the drawer signature MUST change
- **AND** the drawer region MUST refresh.

#### Scenario: Visible backend identity or label changes

- **WHEN** a visible backend group changes its id or display name
- **THEN** the drawer signature MUST change
- **AND** the drawer region MUST refresh.

#### Scenario: Transcript-only state changes

- **WHEN** only transcript revision, loading, streaming, event counts, or prompting tails change for the same owner
- **THEN** the drawer and other non-transcript managed regions MUST preserve DOM identity.
