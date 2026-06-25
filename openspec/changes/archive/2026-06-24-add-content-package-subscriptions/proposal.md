# Proposal: Content Package Subscriptions

## Summary

Move official workflows and plugin-side skills out of the XPI runtime package
and into independently published content package feeds. The plugin installs and
updates official content from a stable subscription feed, while debug-only
content stays limited to developer feeds or local dev roots.

## Motivation

Workflow and skill updates currently require plugin release churn because the
content is packaged with the extension. The plugin should instead treat
official content as an installable subscription artifact so content can ship,
update, and roll back independently from plugin code.

## Design

- Publish `stable`, `beta`, and `dev` content feeds to the independent
  `leike0813/zotero-agents-workflows` repository's fixed `content-feed`
  branch. `stable` and `beta` exclude `debug_only`; `dev` keeps debug content
  and marks the feed accordingly.
- Store long-lived package zip artifacts as GitHub/Gitee Release assets, not in
  the feed branch. The feed branch carries only lightweight JSON metadata.
- Version plugin releases, official Workflow packages, and the `content_api`
  runtime contract independently. Content packages declare semver `requires`
  constraints for plugin, content API, and Zotero versions.
- Let users switch the official feed between `stable` and `beta` in
  preferences; expose `dev` only while debug mode is enabled. Rollback remains
  feed-managed by pointing a channel at an older compatible release asset.
- Install official content under `<runtimeRoot>/content/official` with a
  verified, transactional package installer.
- Load content in this precedence order: `official < dev-local < user`.
- Load dev-local content from `ZOTERO_AGENTS_CONTENT_DEV_ROOT` or
  `<runtimeRoot>/content/dev-local`; debug mode controls only debug-only
  visibility, and dev-local is never written to subscription state.
- Stop synchronizing packaged `workflows_builtin` and `skills_builtin` on
  startup; source directories remain publisher inputs until content fully moves
  to the external content publishing repository.

## Non-goals

- Automatic background content installation on first run.
- Exposing the dev feed in normal user UI.
- Removing historical helper scripts that still read source content directories.
