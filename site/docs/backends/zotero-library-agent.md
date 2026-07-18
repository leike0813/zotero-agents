# Zotero Library Agent

## Overview

Zotero Library Agent is the bounded, on-demand task surface of the [Host Bridge](host-bridge). It enables AI agents to operate a Zotero library for finite requests — inspecting items, retrieving context, reading literature and synthesis data, executing workflows, applying approved mutations, transferring files, and handing off evidence — without becoming a resident library-maintenance service.

The Host Bridge exposes three surfaces, each serving a different role:

| Surface | Role | When to use |
|---------|------|-------------|
| **CLI Bundle** (`zotero-bridge`) | Installation, connection, and low-level command contracts | You need direct CLI access to Host Bridge capabilities |
| **Library Agent** | Bounded task routing, evidence handoff, and auditable results | You have a finite request that needs intent routing and completion evidence |
| **Librarian Profile** (Hermes) | Resident index, scheduled maintenance, and ongoing library service | You need persistent local indexing, cron jobs, or continuous monitoring |

## What the Library Agent Provides

- **Task routing**: Routes the current intent to the smallest matching command family without requiring a full command-table scan.
- **Journey references**: Seven detailed journey manuals cover specific task categories, each specifying branches, near-misses, evidence requirements, approval boundaries, and recovery paths.
- **Evidence handoff**: Portable evidence bundles with deterministic shape validation and artifact digest computation.
- **Authority boundaries**: Enforces that Host Bridge is the only control path, preventing direct Zotero storage access or background service behavior.
- **Bounded operations**: Each task completes when the requested result and its evidence are observable — a submit acknowledgement or prepared handoff is not completion by itself.

## Bounded Task Flow

1. **Confirm connection**: Verify the loaded CLI and Host Bridge profile. Run `zotero-bridge surface identity --json` to compare with the packaged manifest and confirm the repository `releaseSetId`.
2. **Route the intent**: Read the task routing reference to choose the smallest command family that satisfies the request.
3. **Load the matching journey**: Read exactly one journey manual that matches the task category.
4. **Preserve evidence**: Keep current Host facts, returned handles, local artifacts, and approval state as distinct evidence.
5. **Execute or submit**: For workflows, follow the workflow execution reference; never send workflow options through an execution mode that does not accept them.
6. **Build and validate**: Construct the final evidence bundle and validate it with the bundled helper.

The task is complete only when the requested result and its evidence are observable.

## Journey Categories

The Library Agent includes seven journey manuals, each covering a specific task domain:

| Journey | Scope |
|---------|-------|
| **Current Context & Library Read** | Deictic selection, search versus list, item detail, notes, and attachment evidence |
| **Notes, Attachments & Readiness** | Note chunks and payloads, annotations, PDF/Markdown/analysis readiness, and generated attachments |
| **Synthesis Research Context** | Topics, citation graph views, indexes, resolvers, artifacts, schemas, and attention queues |
| **Host-Owned Workflow** | Workflow describe, requirements, validate, submit, monitor, permissions, interaction, and Product evidence |
| **Agent-Owned Handoff** | Agent-run bundle execution, result validation, apply-back, and receipt recovery |
| **Concrete Writeback** | Previewed mutations, semantic write commands, approval, and live verification |
| **Products & Files** | Local paths, registered files, Dashboard Products, downloads, and attachment delivery |

Each journey points to the bundled `zotero-bridge` CLI command cards when exact payload or result fields are needed.

## Authority & Safety Boundaries

The Library Agent enforces strict boundaries to prevent unintended Zotero mutations:

- **Host Bridge only**: Treat Host Bridge as the only Zotero and Zotero Agents control path. Do not read or write Zotero databases, storage directories, plugin internals, or browser state directly.
- **Bounded work**: Do not turn the Library Agent into a background library service. Perform bounded work for the current request and return control when the result or required user decision is available.
- **No unattended writes**: Do not make scheduled or unattended writes. A current user request and Host Bridge approval govern every mutation or apply-back.
- **No stale assumptions**: Do not treat cache entries, generated references, or evidence bundles as live Zotero truth; confirm current facts through Host Bridge when freshness matters.

## Evidence Handoff

The Library Agent produces portable evidence bundles for task continuity. An evidence bundle contains:

- **Status**: `completed`, `canceled`, or `failed`
- **Summary**: Concise task-local findings
- **Evidence file** (optional): A helper-built, validated evidence bundle that another agent or task can consume
- **Diagnostics** (optional): Structured diagnostic information

Build and validate an evidence bundle with the packaged helper:

```sh
python scripts/zotero_library_agent.py evidence build --input evidence-input.json --output evidence.json
python scripts/zotero_library_agent.py evidence validate --input evidence.json
```

The helper validates deterministic shape, computes artifact digests, and inspects workflow bundles. The agent remains responsible for command choice, interpretation, evidence sufficiency, and whether a reviewed action is authorized.

## Failure Handling

- Preserve structured error codes and handle fields when reporting a failure.
- Re-discover a command or object only when the error indicates stale syntax or identity; do not guess alternate handles.
- When an operation returns a file handle or output path, verify the declared file before using it as evidence or apply-back input.
- When required authority, input, or user intent is missing, stop at the boundary and state the exact missing decision.

## Integration

The Library Agent depends on Host Bridge for all Zotero access. Before using the Library Agent:

1. Ensure Host Bridge is running (Zotero → Settings → Zotero Agents → Host Bridge → **Start / Show Endpoint**).
2. Install the `zotero-bridge` CLI (use the **Install CLI** button in Host Bridge preferences).
3. Configure the connection profile with the endpoint URL and Bearer token. See [Host Bridge Configuration](host-bridge) for detailed setup.

## Next Steps

- [Host Bridge](host-bridge) — complete reference for the `zotero-bridge` CLI and Host Bridge capabilities
- [Hermes Profiles](hermes-profiles) — resident library service with local indexing and scheduled maintenance
- [Workflows](../workflows) — overview of all built-in and custom workflows
- [MCP Server](mcp-server) — alternative protocol interface for MCP-compatible clients
