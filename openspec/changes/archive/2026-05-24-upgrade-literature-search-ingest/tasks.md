## 1. OpenSpec

- [x] Create change scaffold.
- [x] Add proposal, design, tasks, and delta specs.

## 2. Literature Search Ingest

- [x] Add `searchMode` workflow parameter and `targeted_ingest` output enum.
- [x] Update `SKILL.md` and runner prompt for targeted ingest, explicit mode
      selection, seed references artifacts, and stronger PDF best effort.
- [x] Enable write approval bypass declaration on this workflow.

## 3. Runtime and Host Bridge

- [x] Add manifest schema/type support for `allowWriteApprovalBypass`.
- [x] Show the default-off write auto-approval run option only for opted-in
      workflows.
- [x] Inject `auto_approve_writes` runtime option from runOptions without
      passing the option as a skill parameter.
- [x] Bind auto-approval to the ACP run Host Bridge profile scope.
- [x] Persist the profiled auto-approval state in the ACP run store.
- [x] Skip Host Bridge mutation approval only for trusted auto-approved run
      scopes.
- [x] Temporarily strip ZoteroHostAccess runtime options from SkillRunner-bound
      requests behind the centralized compatibility switch.
- [x] Log a structured compatibility warning when SkillRunner is selected for a
      workflow that explicitly requires ZoteroHostAccess.

## 4. Tests

- [x] Update workflow/skill contract tests.
- [x] Add Host Bridge auto-approval tests.
- [x] Add Host Bridge CLI profile-scope tests.
- [x] Run targeted validation.
