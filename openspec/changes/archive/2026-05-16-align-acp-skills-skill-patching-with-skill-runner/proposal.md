# Align ACP Skills Skill Patching With Skill-Runner

## Summary

ACP Skills currently injects only a thin run contract into run-local proxy
skills. That contract is too weak compared with the current Skill-Runner
runtime patching model, especially for interactive pending output and repair
prompts. This change aligns ACP Skills skill patching and repair prompts with
the Skill-Runner contract while preserving Zotero Skills thin proxy resource
mapping.

## Changes

- Replace the single thin-proxy prompt block with ordered runtime patch sections:
  runtime enforcement, proxy resource mapping, output format contract, output
  contract details, and execution mode patch.
- Make interactive pending output guidance explicit, including `ui_hints.prompt`,
  `ui_hints.hint`, `ui_hints.options`, and `ui_hints.files`.
- Align repair prompts with Skill-Runner wording and include target output
  contract details.
- Align ACP Skills continuation prompts with the same pending/final branch
  contract.
- Do not inject Skill-Runner artifact redirection; ACP Skills keeps its current
  run workspace artifact behavior.

## Non-Goals

- Do not change Synthesis Workbench, MCP tools, workflow applyResult, or
  `choices` to `options` UI fallback behavior.
- Do not change final output validation semantics beyond prompt/patch wording.

