# Reconcile Stale Runtime Tasks On Startup

## Summary

Unify startup handling for task state left non-terminal by a prior plugin crash or forced Zotero exit. Synthesis operations and provider workflow task projections remain separate domains, but both must stop surfacing stale `running` rows as active UI work after restart.

## Motivation

Synthesis Workbench statusbar rows come from Synthesis operation/progress state, while Dashboard and Assistant running-task surfaces come from provider workflow task projections. Both can be left non-terminal if the plugin process exits before cleanup. Startup should reconcile those persisted runtime rows before first UI render instead of letting stale work remain visible indefinitely.

## Scope

- Add explicit startup reconciliation for Synthesis `running` operations.
- Add domain-aware startup reconciliation for provider workflow task projections.
- Preserve ACP recoverability and SkillRunner backend ledger reconciliation semantics.
- Do not redesign statusbar UI, merge Synthesis and provider task surfaces, or introduce a new queue model.
