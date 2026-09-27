## ADDED Requirements

### Requirement: Hosted Workbench assets SHALL advance as one revision

The hosted Workbench document, its page stylesheet, and its application bundle SHALL carry the same non-empty UI revision whenever their coordinated rendering behavior changes.

#### Scenario: A same-version plugin build updates Topic Report rendering
- **WHEN** Zotero opens the Workbench after installing a build with updated Report code or layout
- **THEN** the document SHALL request the matching revised stylesheet and application bundle
- **AND** the first Topic Report SHALL display its body, outline, actions, and scrollable layout without requiring a second open.
