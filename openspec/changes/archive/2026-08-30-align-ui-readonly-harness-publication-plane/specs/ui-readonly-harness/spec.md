## ADDED Requirements

### Requirement: Harness Assistant panel SHALL deliver through the publication plane

The readonly UI harness SHALL deliver Assistant Workspace data to the shell as
`assistant-workspace:child-publication` envelopes produced by the real
`AssistantWorkspacePublicationRuntime` and
`AssistantWorkspacePublicationCoordinator`, driven by a harness-owned readonly
publication adapter. It SHALL NOT send `assistant-workspace:child-snapshot`,
and it SHALL NOT modify or fork production surface adapters, the shell, or
child pages.

#### Scenario: Harness initializes the Assistant Workspace

- **WHEN** the harness Assistant iframe signals ready
- **THEN** the harness initializes one publication runtime per tab source
  (acp-chat, acp-skills, skillrunner) with readonly adapter data
- **AND** it delivers the resulting publications to the shell in delivery
  order as valid `child-publication` envelopes

#### Scenario: Harness receives a publication ACK

- **WHEN** the shell or a child page returns a publication ACK
- **THEN** the harness forwards it to the publication coordinator
- **AND** transcript rebase requests are served by re-reading the readonly
  snapshot data rather than any live store

#### Scenario: Harness receives a transcript page request

- **WHEN** a child page requests a transcript page through
  `load-transcript-page`
- **THEN** the harness serves the page from readonly data through
  `requestTranscriptPage`
- **AND** no database write or backend call is performed

### Requirement: Harness Assistant INIT SHALL carry production surface configuration and labels

The harness INIT payload SHALL include the real
`ASSISTANT_WORKSPACE_ACTION_REGISTRY` as `surfaceConfiguration.actionRegistry`
and per-tab `surfaceLabels` built by the production label builders, so child
pages resolve actions and panel copy exactly as in the plugin.

#### Scenario: Child page dispatches a registry action

- **WHEN** a child page sends an action from the runtime action registry
- **THEN** navigation/selection actions update only in-memory harness
  selection state and re-publish through the runtime
- **AND** write-capable actions are recorded on the mock action log with a
  readonly reason and are never executed

### Requirement: Harness bundle coverage SHALL include sidebar bundles

The harness bundle builder SHALL produce the Assistant Workspace shell and
child bundles from their `src/sidebar` entry points with the same JSX/Preact
options as the plugin build, and SHALL serve them in place of the static
artifacts so a fresh worktree needs no plugin build and `src/sidebar/**` edits
trigger rebuilds.

#### Scenario: Harness starts in a fresh worktree

- **WHEN** the harness starts without a prior plugin build
- **THEN** the Assistant Workspace shell and child pages load their bundles
  from the in-memory harness build
- **AND** editing `src/sidebar/**` source rebuilds the sidebar bundles and
  reloads connected pages
