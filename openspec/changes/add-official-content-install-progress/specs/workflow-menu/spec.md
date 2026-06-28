## ADDED Requirements

### Requirement: Workflow menu official install SHALL show immediate progress feedback

The workflow shortcut menu SHALL show visible install-in-progress feedback as soon as a user starts official Workflow package installation.

#### Scenario: Install action shows progress before completion

- **WHEN** the user triggers official Workflow package installation from the workflow menu
- **THEN** the plugin SHALL show an in-progress toast before the installation promise settles
- **AND** the toast SHALL include a spinner/progress line updated from the shared install progress snapshot when available.

#### Scenario: Startup update install shows progress before completion

- **WHEN** the user confirms the startup official Workflow package update prompt
- **THEN** the plugin SHALL show an in-progress toast before the installation promise settles
- **AND** completion feedback SHALL match the existing successful or failed install result.
