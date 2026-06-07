# Literature Digest Auto Tag Regulator

## Why

`literature-digest` currently applies digest artifacts as a standalone workflow.
Users often run `tag-regulator` next, using the newly created digest as semantic
context. This should be available as an ACP-only workflow branch without first
writing the digest note and then launching a second workflow manually.

## What Changes

- Upgrade `literature-digest` to `skillrunner.sequence.v1` and ACP-only
  execution.
- Add an `auto_tag_regulator` switch and tag inference parameter visibility.
- Build either a one-step digest sequence or a two-step digest -> tag-regulator
  sequence.
- Pass the digest artifact path to tag-regulator through shared workflow
  workspace handoff.
- Apply digest and tag-regulator results together from the sequence result.

## Impact

- `literature-digest` no longer supports the legacy SkillRunner HTTP backend in
  this first phase.
- Existing standalone `tag-regulator` workflow remains available.
- Sequence runtime gains per-step apply context so workflow apply hooks can
  access intermediate step results.
