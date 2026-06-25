# Normalize Dynamic Sequence Workflow Steps

## Problem

Some built-in `skillrunner.sequence.v1` workflows construct their sequence steps
entirely inside `buildRequest`. That keeps conditional execution flexible, but
it also hides the possible step list from manifest readers, validation, UI
projection, and future workflow tooling.

`literature-analysis`, `literature-deep-reading`, and conditional debug apply
workflows already behave like sequence workflows at runtime, but their manifests
do not declare the possible sequence steps. This makes them inconsistent with
normal declarative sequence workflows such as synthesis and static debug
workflows.

## Goal

Normalize dynamic sequence workflow manifests so they can declare all candidate
steps while keeping `buildRequest` responsible for choosing the actual steps for
each run.

- allow candidate step metadata in `request.sequence.steps` for workflows with
  `hooks.buildRequest`;
- document optional `include_if` metadata for conditional candidate steps;
- validate declared candidate steps when present;
- update the built-in literature analysis, deep reading, and conditional debug
  apply workflows.

## Non-Goals

- Do not introduce a general conditional execution engine.
- Do not rewrite dynamic workflows into fully declarative sequence workflows.
- Do not change SkillRunner or ACP run read-model subtitle logic.
- Do not require every existing hook-driven sequence workflow to declare steps
  in this change.
