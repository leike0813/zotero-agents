## ADDED Requirements

### Requirement: Navigation remains bound to the original Workspace interaction

A foreground Conversation turn SHALL receive transient trusted authority for the exact Workspace host window that submitted its prompt. Before effects, that window SHALL still exist, present the relevant Pi Conversation and retain its source interaction context. Closure, document replacement, source/owner switching SHALL invalidate that interaction permanently. Permission continuation SHALL preserve the original source-window authority, even if approved elsewhere. A new submitted turn SHALL bind its own source. Authority SHALL NOT enter model schemas, catalog identity, transcript, receipts or owner persistence.

#### Scenario: Same owner is presented in two windows
- **WHEN** a turn is submitted in one window while another shows the same owner
- **THEN** navigation targets only the submitting window

#### Scenario: Original Workspace changes while awaiting approval
- **WHEN** the original document, source or owner changes before continuation
- **THEN** its navigation authority fails closed and the approval window is not substituted

#### Scenario: Later prompt is submitted elsewhere
- **WHEN** a new turn is submitted from a different Workspace window
- **THEN** navigation binds to that later source without reusing old authority
