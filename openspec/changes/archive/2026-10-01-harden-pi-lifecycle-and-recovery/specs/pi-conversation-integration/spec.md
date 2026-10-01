## ADDED Requirements

### Requirement: Conversation recovery and deletion respect process holds
Conversation prompts and manual compaction SHALL use process foreground admission. Restart SHALL reconstruct state without dispatch. Existing Workspace recovery controls SHALL support explicit evidence checks; continuation SHALL remain blocked by unresolved effects. Permanent deletion SHALL preserve files while execution or outcome holds remain and retry through lifecycle maintenance.

#### Scenario: Archived Conversation still has a live executor
- **WHEN** the user requests permanent deletion
- **THEN** the owner remains deleting/cleanup_pending and its referenced files remain until safe cleanup
