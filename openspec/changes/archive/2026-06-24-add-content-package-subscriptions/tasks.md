# Tasks

- [x] Create content package subscription OpenSpec artifacts.
- [x] Generate official stable/dev feeds and CI publication inputs.
- [x] Add content package feed fetch, verification, install state, and package
  installer modules.
- [x] Change runtime registry precedence to `official < dev-local < user`.
- [x] Hide debug-only content outside debug mode for both subscriptions and
  dev-local.
- [x] Stop startup built-in sync and remove runtime content directories from
  XPI assets.
- [x] Expose preference events and minimal UI controls for content subscription
  status, check, and install/update.
- [x] Update tests for feed filtering, installer safety, and registry
  precedence.
- [x] Run build, targeted tests, feed dry run, and formatting checks.
- [x] Move default feed publication to the external
  `leike0813/zotero-agents-workflows` repository.
- [x] Add independent official Workflow package version metadata and content
  API compatibility constraints.
- [x] Keep feed branches lightweight by publishing package zip files as release
  assets.
- [x] Document long-term Workflow package versioning, compatibility, channels,
  and rollback policy.
- [x] Treat official Workflow package install state as valid only when the
  installed official workflow files are still present.
- [x] Localize preference-page content package status text and gate the
  install/update button on missing content or compatible updates.
- [x] Expose stable/beta channel switching in preferences, keep dev channel
  debug-only, and represent feed-directed rollback as an install action.
- [x] Distinguish user workflow and skill directories in preferences and create
  default user content directories on startup.
- [x] Validate SkillRunner workflow skill dependencies against the effective
  plugin skill registry.
