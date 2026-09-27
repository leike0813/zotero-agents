## ADDED Requirements

### Requirement: CLI uses semantic mutation leaves
The CLI SHALL map semantic mutation commands directly to typed canonical capabilities, expose `--dry-run` on those commands, and retain `mutation get-operation` for observation. It SHALL reject the removed generic `mutation preview` and `mutation apply` commands.

#### Scenario: Semantic command dry run
- **WHEN** a caller invokes a mutation leaf with `--dry-run`
- **THEN** the CLI submits the operation-specific payload with `dryRun: true`
- **AND** it validates the operation-specific result schema.
