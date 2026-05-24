## Why

`literature-search-ingest` can ingest single papers, but its search flow is too
coarse for exact-paper queries, weakly specified for public PDF discovery, and
requires repeated Zotero write approvals during multi-paper ingest. This makes
the interactive ACP workflow slower and less predictable than the intended
literature search-to-library loop.

## What Changes

- Add `searchMode` to the workflow with `auto`, `topic_expansion`,
  `paper_seed_expansion`, and `targeted_ingest`.
- Teach the skill to run an initial web lookup in auto mode, select
  `targeted_ingest` for exact new papers, and directly ingest that paper after
  user confirmation.
- Strengthen public PDF best-effort guidance and explicitly forbid login,
  proxy, CAPTCHA, and piracy paths.
- Make `paper_seed_expansion` try Synthesis paper references/citation artifacts
  before falling back to seed metadata search.
- Add a workflow-declared, user-selected Host Bridge write auto-approval option,
  enabled for `literature-search-ingest` only.
- Temporarily keep `runtime_options.zotero_host_access` out of SkillRunner-bound
  requests until SkillRunner supports that runtime option, while logging a
  structured compatibility warning for explicitly required workflows.

## Impact

- Code: workflow schema/types, settings descriptor, skillrunner request runtime
  options, Host Bridge CLI profile scope, Host Bridge permission handling.
- Skill/workflow: built-in `literature-search-ingest` prompt, runner prompt,
  workflow manifest, and output schema.
- Compatibility: auto-approval is opt-in and defaults off; single-paper
  `literature.ingest` remains unchanged. SkillRunner provider compatibility is
  not restricted by ZoteroHostAccess declarations.
