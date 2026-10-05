# Design

## Context

See proposal.md for motivation. The preset module is the single source of truth
for host profile creation and the Dashboard snapshot. Existing builders support
optional npm package fields, explicit npx argument lists, multiple isolation
environment variables, and default environment values. The npx cache parser
already accepts `--package`. Existing saved profiles are independent data.

## Goals / Non-Goals

**Goals:** Refresh the catalog through metadata changes, retain host/preview
parity, and record source provenance and installation prerequisites.

**Non-Goals:** Saved-profile migration, new transport or UI models, dependency
installation, real-agent authentication, or additions without a confirmed stdio
ACP entry. Antigravity, Continue, and Python Deep Agents remain outside this change.

## Decisions

### Keep catalog data in the existing owner

Extend the preset ID union and append the new entries after the existing 15.
Existing Cursor adapter precedes native Cursor, retaining correct managed-root
matching for the existing prefix-based directory lookup. No new registry,
runtime network lookup, or family type is needed. Kimi reuses `kimi-code`; all
other new entries use `unknown`.

| ID               | Local launch                          | npm package (`@latest`)          | Isolation                                                  |
| ---------------- | ------------------------------------- | -------------------------------- | ---------------------------------------------------------- |
| cursor           | agent acp                             | none                             | CURSOR_CONFIG_DIR                                          |
| kimi-code        | kimi acp                              | @moonshot-ai/kimi-code           | KIMI_CODE_HOME                                             |
| minimax-code     | mcode acp                             | @minimax-ai/code, explicit mcode | MINIMAX_DATA_DIR                                           |
| mistral-vibe     | vibe-acp                              | none                             | VIBE_HOME                                                  |
| openhands        | openhands acp                         | none                             | OPENHANDS_PERSISTENCE_DIR plus OPENHANDS_CONVERSATIONS_DIR |
| deepseek-harness | dsh --profile acp                     | @deepseek-ai/dsh                 | DSH_HOME                                                   |
| factory-droid    | droid exec --output-format acp-daemon | droid                            | none                                                       |
| goose            | goose acp                             | none                             | GOOSE_PATH_ROOT                                            |
| junie            | junie --acp=true                      | none                             | JUNIE_HOME                                                 |
| kiro-cli         | kiro-cli acp                          | none                             | none                                                       |
| pi-acp           | pi-acp                                | pi-acp                           | PI_CODING_AGENT_DIR                                        |
| amp-acp          | amp-acp                               | amp-acp                          | AMP_ACP_STATE_DIR                                          |
| oh-my-pi         | omp acp                               | none                             | none                                                       |

Factory Droid, Pi ACP, and Amp ACP default to npx; other additions default to
installed commands. Unsupported npx options remain disabled. Factory Droid
uses the ACP registry's `DROID_DISABLE_AUTO_UPDATE=true` and
`FACTORY_DROID_AUTO_UPDATE_ENABLED=false` defaults.

Existing updates: Gemini uses `--acp`; Qwen uses only `--acp` and adds QWEN_HOME;
Qoder uses bare `qoder` while retaining its npm package and preset ID. Copilot,
Cline, CodeBuddy, and Grok add COPILOT_HOME, CLINE_DIR, CODEBUDDY_CONFIG_DIR,
and GROK_HOME, respectively. Other existing launch metadata stays intact.

### Express MiniMax through existing npx arguments

Omit `npxPackage` and use
`npxArgs: ["--package", "@minimax-ai/code@latest", "mcode", "acp"]`.
Both builders already remove the empty package field and prepend `-y`.
The package has multiple executable names, so relying on npm inference would
not select the intended entry. Extending DTOs or adding a product-specific
branch is unnecessary.

### Bound isolation to verified filesystem roots

Each single-variable rule uses the managed profile root. OpenHands sets its
persistence root and explicitly maps conversations to `root/conversations`.
Amp ACP maps only adapter thread/session state; Amp configuration and credentials
remain independently configured. Goose keyring and Copilot cache can remain
external. OMP's PI_CONFIG_DIR names a directory, while PI_CODING_AGENT_DIR does
not cover every source, so no isolation option is added. OMP is Bun-based and
uses its installed `omp` entry, without pretending npx is a supported launcher.

### Reuse existing behavior tests and document sources

Use the public preset builders, Dashboard preview/add action, and npx launch
spec resolver as the approved test seams. Extend existing suites with
parameterized metadata and isolation cases. Preserve the 41-test manager/UI
baseline. Source evidence comes from agent-harness-wiki published
2026-10-04T07:33:08.446Z, official docs/source, ACP registry entries, adapter
READMEs, and npm package manifests; developer docs retain links. User docs and
all eight translations distinguish catalog availability from the existing six
real-agent-tested entries. Generate embedded help through the existing script.

## Risks / Trade-offs

The first embedded-help generation exceeded the existing 6 MiB budget by
85,481 bytes. Expanded preset and isolation tables therefore use compact
Markdown rows with Prettier ignore comments; the Backend Manager examples use
the same format. This removes alignment padding while preserving every cell
and rendered table. The generator and size limit remain unchanged.

- npm `@latest` and upstream commands can change → retain the project's existing
  package convention and record the checked sources; do not claim live-agent tests.
- Isolation moves only declared filesystem roots → document partial scope and
  external state; keep normal launches free of isolation variables.
- Pi/Amp adapters need underlying CLIs; OMP needs Bun → document these installation
  prerequisites without adding dependencies to the plugin.

## Migration Plan

Ship updated creation templates with the plugin. No persisted backend migration
is run. Reverting the catalog/docs change restores old creation templates while
leaving saved profiles untouched. Keep the change active for user review; do not
archive or commit without a separate instruction.
