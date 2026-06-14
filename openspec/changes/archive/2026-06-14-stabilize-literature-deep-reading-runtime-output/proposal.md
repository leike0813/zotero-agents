# Stabilize Literature Deep Reading Runtime Output

## Why

Recent `literature-deep-reading` ACP runs can produce mostly complete HTML, but several runtime-output problems still hurt the reader experience and agent reliability:

- The main agent still decides how to split translation work, which makes large papers inconsistent and encourages incomplete translation.
- Runtime commands can print large content to stdout instead of returning small machine-readable summaries.
- Translation subagent prompts do not strongly constrain fidelity, table handling, formulas, and source-copy avoidance.
- Citation graph data and layout are available, but the final HTML can show the graph frame without a clearly successful visible render.
- Preface cards are agent-shaped, so the opening guide changes structure across runs.

## What Changes

- Generate deterministic translation batch input files during runtime after reading enrichment, without adding a new user-facing stage.
- Keep runtime stdout small by returning summaries and file paths while writing large payloads to files.
- Strengthen batch translation prompts and main-agent review instructions while keeping the official `block-translations.json` schema unchanged.
- Add graph render diagnostics, DOM status, and layout/CSS constraints so graph success and failure are explicit and testable.
- Normalize Preface to four stable slots: research field, research direction, paper position, and reading path.

## Impact

- Affects `literature-deep-reading` skill source, generated built-in package, renderer templates, and focused tests.
- Does not add a workflow, change Host Bridge contracts, or introduce Node as a skill runtime dependency.
- Does not change the official agent-facing block translation payload shape.
