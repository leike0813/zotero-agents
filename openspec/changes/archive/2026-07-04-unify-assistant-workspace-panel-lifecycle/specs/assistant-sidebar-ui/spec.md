## ADDED Requirements

### Requirement: Assistant Workspace child panels SHALL share one lifecycle

ACP Chat, ACP Skills, and SkillRunner child panels SHALL use the same
host/shell/child lifecycle for init, ready, snapshot, cache, and replay. The
Assistant shell SHALL NOT treat SkillRunner as a special panel that may render
from shell-synthesized empty data.

#### Scenario: Startup installs docks without loading child panels

- **WHEN** the plugin installs Assistant Workspace sidebar support for a Zotero
  main window
- **THEN** it creates only the library and reader Assistant dock containers and
  entry buttons
- **AND** it does not create or load the Assistant shell frame
- **AND** it does not load ACP Chat, ACP Skills, or SkillRunner child iframes
- **AND** no library or reader Assistant dock is marked active
- **AND** no active target is committed until the user opens the sidebar.

#### Scenario: First open initializes ACP Chat from host snapshot

- **WHEN** the user opens the Assistant Workspace from a generic Assistant
  Sidebar entry point after Zotero startup
- **THEN** ACP Chat opens as the active tab
- **AND** ACP Chat receives localized labels, current backend controls, and
  current Sessions data from the host snapshot
- **AND** ACP Skills is not refreshed until it becomes the active tab or its
  visible workflow requires it
- **AND** SkillRunner's global sidebar host is not attached while ACP Chat is
  the active tab
- **AND** the visible ACP Chat panel does not remain on static HTML or English
  fallback controls as its steady state.

#### Scenario: Tab switch initializes ACP Skills from host snapshot

- **WHEN** the user switches from ACP Chat to ACP Skills
- **THEN** ACP Skills receives localized labels and the current Runs list from
  the host snapshot
- **AND** any earlier hidden ACP Skills ready event does not trigger host work
  before ACP Skills becomes active
- **AND** it does not render an empty Runs drawer when host run records exist.

#### Scenario: Tab switch initializes SkillRunner from host snapshot

- **WHEN** the user switches to the SkillRunner tab
- **THEN** SkillRunner receives its sidebar init or snapshot from the host
- **AND** the SkillRunner sidebar host is attached only for the active
  SkillRunner tab
- **AND** the shell does not synthesize an empty SkillRunner init payload
- **AND** SkillRunner labels use the user's locale when the host snapshot is
  localized.
