## MODIFIED Requirements

### Requirement: Backend Manager SHALL expose independent Built-in Agent configuration

Backend Manager SHALL retain a read-only fixed-backend Zotero Agent status and an action opening or focusing its independent settings window. All detailed model, authentication, MCP, search and maintenance editing SHALL belong to that window. Settings actions SHALL persist independently of Backend Profile rows and SHALL leave ACP, SkillRunner and Generic HTTP actions unchanged.

#### Scenario: Save a Pi configuration

- **WHEN** the user saves or disables a Pi configuration in the independent settings window
- **THEN** Pi state is updated while existing Backend Profile configuration and drafts remain unchanged

#### Scenario: Open settings while Backend Profiles are unsaved

- **WHEN** the user opens Zotero Agent settings from Backend Manager
- **THEN** its independent window opens without saving or discarding Backend Profile drafts

#### Scenario: No usable configuration exists

- **WHEN** the catalog or saved selection is incomplete or unavailable
- **THEN** the summary displays its basic state and offers configuration rather than an execution action

## REMOVED Requirements

### Requirement: Built-in Agent page manages API keys without exposing plaintext

**Reason**: Detailed credential controls belong to the independent settings capability, which retains credential privacy.
**Migration**: Move the controls and their private-submission contract to Zotero Agent settings; this unreleased UI requires no data migration.

### Requirement: Connection tests run only on explicit request

**Reason**: Explicit per-model tests belong to the independent workbench rather than Backend Manager.
**Migration**: Retain request-bound redacted completion and unchanged defaults in the settings/model configuration capabilities; no data migration.

### Requirement: Built-in Agent page manages MCP Tool Sources

**Reason**: MCP has its own settings page and automatic runtime admission replaces user tool selection/review/promotion.
**Migration**: Implement the settings and MCP source deltas with the existing source/credential owners; no migration or automatic review records.

### Requirement: Built-in Agent page manages explicit Web source order

**Reason**: Search source configuration/order/testing belongs to its independent settings page.
**Migration**: Retain explicit curated sources, permission, secret-free saves and request evidence under settings and brokered Web deltas; no data migration.

### Requirement: Directory controls preserve drafts and bounded region identity

**Reason**: Directory browsing and maintenance move to the independent settings window.
**Migration**: Retain bounded state, request ownership, draft protection and unrelated region identity in the new settings capability; no data migration.
