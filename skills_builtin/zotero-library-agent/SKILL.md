---
name: zotero-library-agent
description: Operate a Zotero library and the Zotero Agents plugin through Host Bridge for on-demand inspection, context retrieval, literature and synthesis reads, workflow execution, approved mutations, file transfer, run interaction, diagnostics, and evidence handoff. Use when an agent needs Zotero facts or plugin actions during a current task without becoming a resident library-maintenance service.
---

# Zotero Library Agent

Use Host Bridge to inspect Zotero first, keep object and run handles explicit, and apply changes only through reviewed mutation or workflow channels.

## Start Each Task

1. Read `references/control-invariants.md` before using handles, approvals, files, workflows, or writeback.
2. Read `references/task-routing.md` to choose the smallest command family that satisfies the request.
3. Read `references/workflow-execution.md` before submitting, interacting with, or applying a workflow.
4. Read `references/evidence-handoff.md` when the result will be handed to another agent, framework, or later task.
5. Use `references/terminology.md` when Zotero, Synthesis, artifact, or run terminology is ambiguous.
6. Use `references/host-bridge.md` for the generated command surface and current CLI version.
7. Read the bundled `zotero-bridge-cli` Skill when connection setup, profile discovery, raw payload shape, or CLI failure handling needs more detail.

## Operating Loop

1. Confirm the loaded CLI and profile when command help or connection state is uncertain.
2. Resolve phrases such as "this paper" or "the selected collection" through Host Bridge context; never infer Zotero object identifiers from titles alone.
3. Prefer bounded semantic reads and follow returned cursor or file metadata for larger results.
4. Separate interpretation from action: decide what the result means before choosing a workflow or mutation.
5. Preview or describe writes when supported, preserve approval boundaries, and stop on denial or structured errors.
6. Track only handles needed by the current task. Return or persist portable evidence explicitly when another system needs continuity.

## Authority Boundary

- Treat Host Bridge as the only Zotero and Zotero Agents control path provided by this Skill.
- Do not read or write Zotero databases, storage directories, plugin internals, or browser state directly.
- Do not turn this Skill into a background library service. Perform bounded work for the current request and return control when the result or required user decision is available.
- Do not make scheduled or unattended writes. A current user request and Host Bridge approval still govern every mutation or apply-back.
- Do not treat cache entries, generated references, or evidence bundles as live Zotero truth; confirm current facts through Host Bridge when freshness matters.

## Failure Handling

- Preserve structured error codes and handle fields when reporting a failure.
- Re-discover a command or object only when the error indicates stale syntax or identity; do not guess alternate handles.
- When an operation returns a file handle or output path, verify the declared file before using it as evidence or apply-back input.
- When required authority, input, or user intent is missing, stop at the boundary and state the exact missing decision.
