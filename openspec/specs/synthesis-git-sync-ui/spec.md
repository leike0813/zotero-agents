# synthesis-git-sync-ui Specification

## Purpose
Documents the retired Synthesis Git Sync Workbench UI. All Git Sync Workbench actions, status projections, and configuration UI have been removed. WebDAV Sync UI is the only sync projection in Workbench.

## Requirements

### Requirement: Git Sync Workbench UI is retired

Synthesis Workbench SHALL NOT render Git Sync status, actions, or configuration UI. All Git Sync Workbench projections have been removed without compatibility shims.

#### Scenario: Workbench shows no Git Sync surface
- **WHEN** Workbench builds its snapshot
- **THEN** it SHALL NOT include Git Sync status, actions, or configuration rows
- **AND** WebDAV Sync UI SHALL be the only sync projection.
