# Proposal

## Why

The built-in Pi runtime still authenticates subscription use through a Codex device flow and private backend-api endpoints. The approved incremental-upgrade map requires official Sign in with ChatGPT (SIWC), with verified registration identity, explicit plan permission and actual Responses completion evidence.

## What Changes

- **BREAKING**: replace the development-only Codex OAuth, discovery, execution and native-search routes with official SIWC; do not convert old tokens or implicitly rebind owners.
- Add one profile-owned authentication module for stable host identity, multiple registrations, browser authorization, callback verification, refresh rotation and revocation.
- Add one SIWC Provider policy over the admitted Pi 1.0.0 Responses implementation; retain namespace tools, actual terminal and measured usage, bounded retries and durable registration-scoped quota admission.
- Discover visible models per registration through the official API, preserving unknown target-applicable facts and account isolation.
- Integrate task-scoped startup-continuation consent, safe UI controls and existing canonical owner/Workspace boundaries.
- Clean only obsolete Codex development facts and retain other credentials, historical execution evidence and unknown-effect holds.

## Capabilities

### New Capabilities

- `pi-chatgpt-auth`: verified multi-registration SIWC lifecycle and registration-scoped inference admission.

### Modified Capabilities

- `pi-openai-codex-auth`: remove all requirements for the replaced development capability.
- `builtin-pi-provider-configuration`: explicit ChatGPT registration binding, official discovery and isolated target metadata.
- `pi-api-key-provider-execution`: explicit authentication policy, SIWC wire/terminal/tool/usage contracts and bounded retries.
- `pi-brokered-web-tools`: official SIWC native search with existing network, provenance and single-source dispatch contracts.
- `pi-turn-preparation`: SIWC output reserve, transformed-tool budgets and incomplete-message exclusion.
- `builtin-pi-owner-persistence`: canonical consent and partial/unknown invocation evidence.
- `pi-skill-run-integration`: task-scoped consent and explicit registration-pause continuation.
- `pi-conversation-integration`: incomplete response projection and shared pause gates for main/compaction/title.
- `pi-runtime-lifecycle`: authentication cleanup and consent-bound startup continuation.
- `pi-failure-contract`: safe structured SIWC failures and recovery identity.
- `pi-runtime-audit`: bounded structural SIWC evidence without native response content.
- `backend-manager-ui`: official login, registration selection, plan permission, usage and explicit recovery controls.

## Impact

Use the exact file-impact and acceptance inventory approved in [the OpenSpec handoff](https://github.com/leike0813/zotero-agents/issues/68#issuecomment-5967268824), following the [authentication resolution](https://github.com/leike0813/zotero-agents/issues/66#issuecomment-5966881349) and [inference resolution](https://github.com/leike0813/zotero-agents/issues/67#issuecomment-5966970625). Add `piChatGPTAuth.ts` and `piChatGPTProvider.ts`; remove `piOpenAICodexAuth.ts`. Reuse encrypted credentials, canonical transcripts, process lifecycle, Pi parser and sealed network facilities. No dependency, Agent owner, parallel runner, commit or publication is introduced. Update current-state guidance, locale/help sources and ADR 0003. Hand candidate-bound real-host/service evidence to the existing `verify-builtin-pi-runtime-release` change; absent evidence remains missing.
