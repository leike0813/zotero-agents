# Spec Delta

## Purpose

Help users discover and review legacy Literature Artifact migration when first enabling the feature or upgrading the plugin, while preserving explicit consent for every write.

## ADDED Requirements

### Requirement: Startup SHALL check migration once per successful version

After local runtime and UI readiness, startup SHALL scan the personal library when no successful check exists for the current plugin and migration definition version. A successful check SHALL persist a version marker. Failed or interrupted checks SHALL remain retryable at the next startup. Concurrent local migration work SHALL not be duplicated or displaced.

#### Scenario: First enablement or upgrade
- **WHEN** the current version has not completed its migration check
- **THEN** startup SHALL perform one read-only personal-library scan.

#### Scenario: Same version restarts
- **WHEN** the current version already completed its check
- **THEN** startup SHALL neither scan again nor repeat its reminder.

#### Scenario: The previous check failed
- **WHEN** the check failed or was interrupted before completion
- **THEN** the next startup SHALL attempt a new read-only check without resuming writes.

### Requirement: Startup migration progress SHALL be visible

The check SHALL display actual scan and conversion progress in a toast, using an indeterminate indicator when total work is unknown. Completion, failure, stop and plugin shutdown SHALL settle the progress indicator.

#### Scenario: Scan total is unknown
- **WHEN** a scan has not obtained a total
- **THEN** the toast SHALL show completed work without claiming a completion percentage.

### Requirement: Candidates SHALL produce an actionable reminder

After finding migration candidates, startup SHALL offer Open migration and Later in a dialog that names the permanent Dashboard migration entry. Open SHALL navigate to the issued scan result and reuse an existing page. Later SHALL suppress repeated reminders for that checked version; a subsequent upgrade SHALL check again. An empty scan SHALL not show a migration dialog.

#### Scenario: The user opens the wizard
- **WHEN** Open migration is chosen
- **THEN** the Dashboard SHALL select Migrations and the issued preview without scanning again.

#### Scenario: The user postpones
- **WHEN** Later is chosen
- **THEN** the reminder SHALL identify Dashboard → Migrations as the manual entry
- **AND** the same version SHALL not remind again after restart.
