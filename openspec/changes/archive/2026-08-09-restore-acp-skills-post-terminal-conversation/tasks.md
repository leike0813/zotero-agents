## 1. Contract and regression tests

- [x] 1.1 Add post-terminal eligibility, explicit Connect, multi-turn Reply,
      frozen workflow evidence, completion-marker, error, permission, timeout,
      interrupt, disconnect/reconnect, startup cleanup, controller-race, and
      legacy-migration cases to the existing ACP runner suite.
- [x] 1.2 Add sequence-step concurrency coverage proving terminal conversation
      bypasses submission slots and leaves later steps and sequence state intact.
- [x] 1.3 Extend Host Bridge, Assistant Workspace publication, and UI smoke tests
      for terminal liveness/action separation, required `canArchive`, and managed
      region DOM identity.

## 2. ACP run lifecycle

- [x] 2.1 Add the single non-persisted terminal-conversation eligibility
      classifier and process-local controller purpose, preserving workflow
      purpose for initial controllers.
- [x] 2.2 Split recovered prompt dispatch and settlement so post-terminal prompts
      reuse ACP conversation infrastructure but cannot invoke workflow guards,
      convergence, result writes, apply, or sequence continuation.
- [x] 2.3 Make terminal Connect/Reply bypass submission slots and preserve all
      task/apply/error evidence across completion, error, permission, interrupt,
      force-stop, timeout, and Disconnect.
- [x] 2.4 Make continuation terminal-first, retain apply-failed recovery
      candidates, tighten legacy migration, and normalize stale terminal
      conversation activity during startup.
- [x] 2.5 Make task projection terminal-first so conversation permission/error
      state cannot make a completed or failed task appear live.

## 3. Workspace, Host Bridge, and archive

- [x] 3.1 Project terminal Connect, composer, busy/idle, interrupt, history-group,
      and terminal liveness independently in ACP Skills Workspace and Host Bridge.
- [x] 3.2 Add required `canArchive` to owner navigation entries and explicitly
      project it from ACP Chat, ACP Skills, and SkillRunner sources.
- [x] 3.3 Disable and reject archive while a terminal conversation is connecting,
      connected, or prompting, requiring Disconnect first.
- [x] 3.4 Preserve region-level memoization so terminal streaming updates only the
      transcript managed region.

## 4. Documentation and verification

- [x] 4.1 Update the ACP Skills state-machine SSOT with the independent terminal
      conversation axis, dispatch/admission boundary, recovery, and archive rules.
- [x] 4.2 Run the targeted Mocha suites, Node core suite, SSOT invariant check,
      TypeScript checks, ESLint, and strict OpenSpec validation.
