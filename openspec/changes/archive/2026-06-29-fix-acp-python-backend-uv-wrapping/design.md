## Context

ACP SkillRunner-compatible runs currently inspect a skill's `runtime.dependencies` and, when uv is available, wrap the entire ACP backend launch as `uv run --isolated --with <dependency> -- <backend command> <args>`. That works for Node-based ACP backends, but Hermes is a Python CLI installed in its own environment. Running its console entrypoint inside uv's temporary isolated environment breaks Hermes' package imports before the ACP handshake can complete.

The Backend Manager Kilo preset also lacks npm/npx metadata even though Kilo's official CLI package is `@kilocode/cli` and exposes `kilo`.

## Goals / Non-Goals

**Goals:**

- Keep Hermes ACP backend launches unchanged when resolving runtime dependencies for ACP SkillRunner-compatible runs.
- Preserve the existing uv wrapping behavior for non-Hermes ACP backends.
- Add Kilo npm/npx preset metadata without changing the default Kilo launch mode.
- Cover the behavior with focused regression tests.

**Non-Goals:**

- Do not introduce a broad runtime detector for every possible Python-authored ACP backend in this change.
- Do not change how skill scripts themselves install or execute Python dependencies.
- Do not install Kilo, Hermes, uv packages, or any other dependency.

## Decisions

1. Use `agentFamily: "hermes"` as the uv-wrapper bypass key.

   Hermes is already a first-class ACP agent family and the failure is specific to its Python CLI runtime. A family-based rule is deterministic, cheap, and matches existing Hermes-specific behavior for catalog skill discovery. A generic command-path detector is intentionally deferred because it would need platform-specific false-positive handling and user-defined backend semantics.

2. Keep dependency probing but skip backend command wrapping for Hermes.

   The plan should still report declared runtime dependencies, because those dependencies matter to the skill workflow. The only behavior being bypassed is wrapping the ACP backend process. Returning the original backend with an info diagnostic keeps run state understandable without hiding the declared dependency surface.

3. Add Kilo npx support while preserving `defaultUseNpx: false`.

   The existing preset uses the locally installed `kilo acp` command. Adding `npxPackage: "@kilocode/cli@latest"` and matching `npxArgs` enables users to select npm/npx launch without changing current default behavior or requiring migration.

## Risks / Trade-offs

- Hermes skills that depend on Python packages still need an execution-time way to access those packages; bypassing backend wrapping only prevents backend startup failure. This change keeps the existing runtime dependency status diagnostic visible so follow-up work can address script-level dependency execution if needed.
- A custom Python ACP backend with `agentFamily: "unknown"` can still be uv-wrapped and fail similarly. This change intentionally solves the known first-party Hermes failure first; a later change can add generic Python backend detection.
- Kilo's npm package exposes `kilo` and `kilocode` bins through `@kilocode/cli`; if the package changes its ACP arguments, the preset may need a future metadata update.
