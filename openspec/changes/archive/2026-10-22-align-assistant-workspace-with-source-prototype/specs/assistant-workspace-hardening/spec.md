## ADDED Requirements

### Requirement: Two-lane source navigation reaches every registered panel

Workspace SHALL show Conversations and Skill Runs above a fixed source row. Every navigable source SHALL have a working child panel. Source tabs SHALL expose counts, attention, selection semantics and arrow-key activation. Only inactive lanes SHALL show aggregate attention. Selection SHALL preserve each source's owner and each lane's remembered source.

#### Scenario: Select Zotero Agent Skill Runs

- **WHEN** a user selects Skill Runs and Zotero Agent
- **THEN** its production panel loads through the common publication bridge and exposes its selected run or empty state

### Requirement: Conversations share an accessible creation picker

Each Conversation source SHALL offer the banner new-item button, including with no selected owner. It SHALL open a keyboard-accessible menu containing Zotero Agent and configured External Agent backends with availability. Choosing an item SHALL select its source and create once through that source's action. Skill Runs SHALL expose no new-item button.

#### Scenario: Create from a different conversation source

- **WHEN** the user chooses an available External Agent backend from a Zotero Agent banner
- **THEN** External Agent becomes selected and the requested backend receives one creation action

### Requirement: Pi panels use owner facts and applicable controls

Pi panels SHALL present owner identity, runtime, model, status and usage using shared regions. Conversations SHALL expose Sessions and permitted archive actions. Only supported runtime selectors SHALL appear and fill the available row. Unknown or partial usage SHALL remain distinguishable from measured zero. Transcript-only updates SHALL preserve unrelated DOM and drafts.

#### Scenario: Inspect an idle Pi conversation

- **WHEN** its owner permits archive
- **THEN** the Sessions drawer offers archive and the panel does not show ACP connection controls
