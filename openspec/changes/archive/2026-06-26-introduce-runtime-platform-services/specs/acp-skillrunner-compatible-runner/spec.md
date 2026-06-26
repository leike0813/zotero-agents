## MODIFIED Requirements

### Requirement: ACP backend SHALL execute SkillRunner-compatible workflow jobs

The ACP execution path SHALL use shared platform command and path services when
preparing local workspaces, Host Bridge CLI injection, dependency wrappers, and
backend launch commands.

#### Scenario: ACP backend command runs on Windows

- **GIVEN** a Windows ACP backend command currently resolves through `npx.cmd`,
  PowerShell, cmd, or a user-local executable
- **WHEN** the platform services migration is applied
- **THEN** the command line, arguments, and PATH injection behavior SHALL remain
  equivalent.

#### Scenario: ACP backend command runs from a GUI Linux runtime

- **GIVEN** Zotero is launched without a login-shell PATH
- **WHEN** ACP execution launches a backend command such as `npx`
- **THEN** the command resolver SHALL use shared non-interactive lookup
  candidates before reporting failure.
