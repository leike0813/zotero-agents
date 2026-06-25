# Rewrite ACP Skills and SkillRunner Separated Run Stores

## Summary

Rewrite ACP Skills and SkillRunner local run persistence as two separate run
stores. The two backends may share pure result/projection helpers, but they
MUST NOT share a persistent SSOT table or run-state owner.

## Problem

ACP Skills and SkillRunner currently use different mixtures of task rows,
request ledgers, recoverable contexts, sequence state, and dashboard history.
For SkillRunner in particular, terminal state can be observed by a ledger path
that only updates UI rows while terminal apply and sequence continuation live in
the reconciler context path. This split allows successful backend runs to show
unknown foreground failures, sequence steps to stop, and stale rows to disappear.

ACP Skills also stores a large run record in a generic task-row scope, which
makes it too easy for SkillRunner request ids to pollute ACP run state.

## Goals

- ACP Skills uses ACP-only run tables.
- SkillRunner uses SkillRunner-only run tables.
- Old ACP/SkillRunner local run data is cleared once on schema upgrade.
- SkillRunner request ledger, recoverable context, dashboard history, and
  sequence state are replaced by a single SkillRunner run record model.
- ACP foreground apply remains ACP-owned.
- SkillRunner terminal apply and sequence continuation remain settlement-owned.
- UI surfaces consume projections from the backend-specific stores.

## Non-Goals

- Do not change ACP backend protocol.
- Do not change SkillRunner backend protocol.
- Do not migrate old ACP/SkillRunner local run history.
- Do not merge ACP Skills and SkillRunner into one persistent store.

