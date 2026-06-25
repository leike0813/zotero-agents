# Workflow Overview

## What is a Workflow?

Workflows are the core feature of Zotero Agents, allowing you to combine multiple skill steps into automated processing pipelines. A Workflow defines a complete task: from receiving input, processing data, to producing output.

## Workflow Structure

```
workflow.json (manifest file)
├── manifest: declares metadata, version, name
├── parameters: defines configurable parameters
├── inputs: defines input types (attachments, items, notes, etc.)
├── hooks: JavaScript hook scripts (filter inputs, build requests, apply results)
└── provider: specifies the required backend type
```

### Input Unit Types

| Type | Description |
|------|------|
| `attachment` | Attachment files of an item |
| `parent` | Parent item of the selected item |
| `note` | Note item |
| `workflow` | Batch scope |

### Hook System

Workflows can run custom JavaScript scripts at various stages of execution:

- **filterInputs**: Filter and select inputs
- **buildRequest**: Build the request content sent to the backend
- **normalizeSettings**: Normalize user settings
- **applyResult**: Apply the results returned by the backend to Zotero

## Three Execution Backends

Workflows can be executed through three backend types:

| Backend | Request Type | Use Case |
|---------|-------------|---------|
| **Skill-Runner** | `skill.run.v1` | General skill execution, supports interactive mode |
| **ACP** | `acp.skill.run.v1` | Skill execution via ACP backend |
| **Generic HTTP** | `generic-http.request.v1` | HTTP API calls |

## Official Workflow Package

Official Workflows are published and installed as **standalone packages**, decoupled from the plugin itself. Installation methods:

- Right-click menu → **Zotero Agents** → **📦 Install Official Workflow Package**
- Click **Install Official Workflow Package** in Preferences

Official packages support three update channels: stable / beta / dev. The plugin automatically checks for updates on startup.

## Official Workflows

The plugin includes a series of official workflows, grouped by function:

### 📚 Literature Analysis Toolkit

| Workflow | Purpose | Input | Backend | Docs |
|---------|------|------|------|------|
| **Literature Analysis** ⭐ | Generate digest, references, citation analysis from PDF/MD. Can cascade into tag regulation | Attachment | Skill-Runner | [Details](literature-analysis) |
| **Interactive Literature Explainer** | Multi-turn dialogue with AI for deep literature understanding, with verified answers to prevent hallucination | Attachment | Skill-Runner | [Details](literature-explainer) |
| **Deep Reading** | Generate structured deep reading HTML view with translation support | Attachment | ACP | [Details](literature-deep-reading) |
| **Literature Search & Ingest** | Let the Agent search academic literature and ingest directly into Zotero | workflow | ACP | [Details](literature-search-ingest) |
| **Tag Bootstrapper** | Interactively create a controlled tag vocabulary for a research domain | workflow | Skill-Runner | [Details](tag-bootstrapper) |
| **Tag Regulator** | Normalize tags based on a controlled vocabulary and infer new tags | Parent item | Skill-Runner | [Details](tag-regulator) |
| **Export/Import Notes** | Export or import analysis notes with support for editing and re-importing | Parent item | No backend required | [Details](export-import-notes) |

### 🛠️ Utilities

| Workflow | Purpose | Input | Backend | Docs |
|---------|------|------|------|------|
| **MinerU PDF Parsing** | Call MinerU service to parse PDF into Markdown | Attachment | Generic HTTP | [Details](mineru) |
| **Topic Synthesis** | Three-step pipeline to create topic synthesis analysis and reports | workflow | ACP | [Details](topic-synthesis) |
| **Manuscript Literature Framing** | Generate Introduction / Related Work LaTeX drafts | workflow | ACP | [Details](manuscript-literature-framing) |

### 🔧 Debug Tools

| Workflow | Purpose | Backend | Docs |
|---------|------|------|------|
| **Debug Probe** | Workflow system development testing and diagnostics | Skill-Runner | [Details](debug-probe) |

## Next Steps

- [Workflow Invocation & Configuration](invocation)
- [Backend Configuration](../backends/) — Detailed instructions for configuring backends
