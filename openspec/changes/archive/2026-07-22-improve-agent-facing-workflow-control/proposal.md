## Why

Agent callers currently have to infer backend-specific provider profile fields from workflow-shaped responses, and ACP/SkillRunner runtime selections can be accepted without a reliable indication that they were applied. The published CLI and agent packages also lack one complete, machine-readable explanation of every option, workflow purpose, and the maintenance steps needed to keep reference sidecars and citation graphs current.

## What Changes

- Separate workflow input contracts from provider profile contracts. Workflow query and validation cover only selection/options/execution requirements; provider profile query and validation cover only one configured backend.
- Add workflow-independent provider profile list, describe, and validate commands under the existing `workflow profile` CLI namespace.
- Keep `workflow submit` as the only command that combines workflow input and a provider profile, with a distinct compatibility preflight before approval or dispatch.
- Add CLI-process support for `ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE`, with explicit input taking precedence and no Host Bridge persistence.
- Make ACP and SkillRunner provider option validation/application fail closed and expose non-sensitive applied/rejected audit facts.
- Add official, independently approved reference-sidecar refresh and citation-graph update operations with typed operation receipts.
- Publish complete command, option, workflow, and package-helper descriptors and add required workflow descriptions.
- Expand the Zotero Library Agent and Zotero Librarian guidance with the ordered literature-to-research-bundle journey.
- **BREAKING** Remove provider profile input and provider-specific schema projection from workflow describe, requirements, and validate contracts; callers use the independent profile commands instead.

## Capabilities

### New Capabilities

- `backend-provider-profile-contract`: Backend-scoped profile discovery, validation, environment default resolution, and provider application audit.
- `synthesis-reference-graph-maintenance-control`: Public asynchronous operations for reference-sidecar refresh and citation-graph update.
- `agent-cli-self-description`: Complete machine-readable and human-readable command, option, workflow, and helper surfaces.

### Modified Capabilities

- `host-bridge-workflow-control`: Separate workflow validation from provider validation and perform their compatibility join only during submit.
- `host-bridge-cli-interface`: Add independent profile commands, the CLI-owned default profile environment variable, new Synthesis commands, and updated surface identity.
- `host-bridge-cli-synthesis-subcommands`: Add the two maintenance commands under the canonical `synthesis` command tree and correct stale command identities.
- `workflow-manifest-authoring-schema`: Require workflow descriptions and explicit execution-mode facts.
- `synthesis-reference-sidecar-citation-graph`: Expose bounded sidecar and graph operations while preserving separate transactions and last-good graph state.
- `synthesis-maintenance`: Define operation handles, idempotency, scope, and terminal receipts for the new maintenance controls.
- `synthesis-job-progress-reporting`: Make the new operations observable through the formal status surface.
- `host-bridge-approval-prompts`: Give both maintenance operations independent, scope-specific approval prompts.
- `zotero-library-agent-bundle`: Teach independent workflow/profile validation and the ordered research journey.
- `zotero-librarian-profile`: Teach the same journey without crossing the resident/on-demand responsibility boundary.

## Impact

- TypeScript provider, workflow-control, ACP/SkillRunner runtime, Synthesis maintenance, capability, permission, and server modules.
- Rust `zotero-bridge` command parsing, request construction, offline Agent Surface, and error contracts.
- Workflow manifests, schemas, localization, surface renderers, Library Agent bundle, Librarian profile, and package-owned helper descriptors.
- Existing Host Bridge, provider, Synthesis, CLI surface, workflow manifest, bundle, and profile tests.
- CLI binary identity and generated content checks change, but release dispatch remains outside this change.
