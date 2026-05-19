# Unify Dashboard Sidebar Synthesis Visual Theme

## Why

Dashboard, Assistant sidebar panels, and Synthesis Workbench currently maintain
separate color tokens and theme assumptions. Synthesis and Workspace already
have partial light/dark support, but Dashboard and sidebar panels still lock
some pages to `color-scheme: light`, while Topic Detail uses its own `--topic-*`
tokens without a complete dark-mode bridge.

This causes visible drift between product surfaces and makes later UI work
fragile.

## What Changes

- Add a shared theme foundation with unified `--zs-*` tokens.
- Support System, Light, and Dark theme choices through a small shared runtime.
- Load the shared theme in Workspace, Dashboard, Assistant sidebar pages,
  Synthesis Workbench, and workflow settings.
- Map Dashboard, Assistant, and Topic Detail semantic tokens onto the shared
  token set.
- Remove page-level light-only theme locks from Assistant sidebar panels.
- Add a compact Workspace theme switch so users can change theme explicitly.

## Non-Goals

- No backend, runtime, workflow, or persistence contract changes.
- No full visual redesign of Dashboard, Assistant panels, or Synthesis layouts.
- No new UI framework or icon library.

