# Proposal

## Why

The current OMP catalog is bundled with the plugin, loses execution metadata, and cannot independently update supported models. Change B implements the approved [Pi runtime upgrade map](https://github.com/leike0813/zotero-agents/issues/58) and its source, metadata, update and maintenance decisions after the admitted matched Pi 1.0.0 upgrade.

## What Changes

- Replace the OMP public catalog dependency with a pinned official Pi seed and an independently refreshed official public catalog. Ordinary builds and configuration loading remain offline.
- Centralize declarative normalization, target/auth applicability, unknown facts, execution compatibility, reasoning, limits and pricing in project-owned contracts.
- Add bounded conditional downloads, atomic source commits, current/previous recovery, explicit overlay management, credential-isolated persistent discovery, shared refreshes and lifecycle-owned scheduling.
- Bind saved connections, preserve missing configured models and defaults, reject explicit retirement, and freeze complete applicable metadata per turn.
- Persist safe selection and invocation usage/cost evidence in canonical history; estimates use frozen rates, preserve unknown values and do not recalculate historical costs.
- Expose bounded directory state and request-associated actions while preserving unsaved forms and unrelated DOM identity.
- Add explicit offline seed preparation and daily public compatibility monitoring using the same normalizer. No SDK upgrade or upstream data mirror is introduced.
- **BREAKING**: OMP is removed as the maintained public base. Read-only `models.yml` remains supported. Old Codex authentication remains until Change C.

## Capabilities

### New Capabilities

None; these behaviors belong to the existing provider/configuration, preparation, execution, persistence and UI boundaries.

### Modified Capabilities

- `builtin-pi-provider-configuration`: official independent sources, recovery, target binding and complete frozen facts.
- `pi-turn-preparation`: frozen applicable constraints and safe selection/invocation references.
- `pi-api-key-provider-execution`: declarative SDK mapping, hard input limits and actual usage with unknown estimates.
- `builtin-pi-owner-persistence`: canonical safe metadata and invocation accounting independent of current catalog.
- `pi-conversation-integration`: anchored continuation selection and invocation-purpose accounting.
- `pi-skill-run-integration`: anchored continuation with fresh per-turn validation.
- `backend-manager-ui`: safe directory state, correlated refresh/recovery actions and draft preservation.

## Impact

Primary files: `src/shared/piProviderContract.ts`, `src/modules/piModelCatalog{,Data}.ts`, `src/config/piModelCatalogSeed.ts`, `piProviderConfiguration.ts`, `piProviderExecution.ts`, `piTurnPreparation.ts`, `piRuntime.ts`, `piConversation.ts`, `piSkillRun.ts`, `piOwnerPersistence.ts`, existing workspace/usage projections, Backend Manager host/page/wire modules, `hooks.ts`, manifest/lock, maintenance script/workflow and existing runtime/dashboard/Zotero tests. Update backend-manager and Pi acceptance documentation. Reuse runtime persistence, encrypted credentials and existing test runners. Full six-host clean-candidate acceptance remains owned by C20; Change B records concrete local and host evidence without certifying unavailable targets or SIWC.
