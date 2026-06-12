<p align="center">
  <img src="addon/content/icons/icon_full.png" alt="Zotero Skills" width="128" />
</p>

<h1 align="center">Zotero Skills</h1>

<p align="center">
  <strong>A pluggable workflow engine for Zotero 7 — turn your library into an AI-powered research hub.</strong>
</p>

<p align="center">
  <a href="https://github.com/leike0813/Zotero-Skills/releases"><img src="https://img.shields.io/github/v/release/leike0813/Zotero-Skills?style=flat-square&color=blue" alt="Release" /></a>
  <a href="https://github.com/leike0813/Zotero-Skills/blob/main/LICENSE"><img src="https://img.shields.io/github/license/leike0813/Zotero-Skills?style=flat-square" alt="License" /></a>
  <a href="https://www.zotero.org/"><img src="https://img.shields.io/badge/Zotero-7-CC2936?style=flat-square&logo=zotero&logoColor=white" alt="Zotero 7" /></a>
  <img src="https://img.shields.io/badge/TypeScript-4.0+-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
</p>

<p align="center">
  <a href="README-zhCN.md">简体中文</a> ·
  <a href="README-frFR.md">Français</a> ·
  <a href="README-jaJP.md">日本語</a>
</p>

---

## ✨ What Is Zotero Skills?

Zotero Skills is a **framework-style plugin** for Zotero 7 that provides a universal execution shell for AI and automation workflows. Instead of hard-coding specific features, the plugin offers:

- 📦 **Pluggable Workflows** — Business logic lives in external workflow packages, not in the core plugin.
- 🔌 **Multi-Backend Support** — Route tasks to [Skill-Runner](https://github.com/leike0813/Skill-Runner), generic HTTP APIs, or local pass-through logic.
- ⚡ **Unified Execution** — Selection context, request building, job queuing, result application, and error handling are all handled by a shared runtime.

> Think of it as a **workflow engine inside Zotero** — you define _what_ to do via declarative manifests and hook scripts, and the plugin handles _how_ to execute it.

## 🚀 Key Features

| Feature               | Description                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| **Workflow Engine**   | Declarative `workflow.json` manifests + optional hooks (`filterInputs`, `buildRequest`, `applyResult`) |
| **Provider Registry** | Three built-in providers: `skillrunner`, `generic-http`, `pass-through`                                |
| **Backend Manager**   | GUI for configuring multiple backend profiles per provider type                                        |
| **Task Dashboard**    | Real-time job monitoring, SkillRunner chat interaction, runtime logs                                   |
| **Workflow Settings** | Per-workflow persistent & one-shot parameter overrides                                                 |
| **Note Editor**   | Host-based renderer for structured data editing (e.g. reference notes)                                     |
| **Log Viewer**        | Filterable runtime logs with NDJSON export for diagnostics                                             |

## ✨ Why Zotero Skills?

### Use Your Subscriptions & Coding Plans, Not Per-Token Billing

Literature analysis tasks are **token burners** — digesting papers, generating references, running citation analysis, and interactive Q&A all consume massive amounts of tokens. Per-token API billing gets expensive fast.

This plugin lets you leverage your existing **coding plans** and **subscription quotas** (OpenAI, Google, Alibaba, Zhipu, etc.) to run AI-powered workflows at a fraction of the cost. No markup, no intermediary — your credentials go directly to the backend.

### Pluggable Workflows & Skills

The plugin is a **framework**, not a feature monolith. Everything is pluggable:

- **Bring your own workflows**: Drop a workflow package into the workflows directory and it's immediately available. No plugin rebuild needed.
- **Custom Skill-Runner skills**: Define your own AI skills with Skill-Runner's skill packaging system and run them through the same execution pipeline.
- **Shareable packages**: Workflow packages support shared `lib/` modules, making it easy to build cohesive workflow suites.

### Multi-Backend Flexibility

- Route different workflows to different backends — some tasks through Skill-Runner, others through direct HTTP APIs or local pass-through logic.
- Switch backends without changing workflow definitions — the provider layer handles the translation.
- A stable, reliable agentic execution framework with a developer-friendly interface. The built-in workflows are just the starting point — the execution pipeline is the real asset.

## 💡 Engine Recommendations

### Codex (Top Recommendation)

- **Pros**: Best-in-class performance across agent CLI tools and LLM models (speed, comprehension, output stability). Supports thought process streaming. Extremely stable execution. Free tier available with model access limitations.
- **Cons**: Free tier has model access restrictions (may not include latest/most powerful models).
- **Verdict**: First recommendation for most users. Even the free tier delivers excellent results.

### Opencode

- **Pros**: Supports multiple model providers. Highly recommended when paired with Alibaba's Wanli Coding Plan, Zhipu Coding Plan, etc. Models like Qwen3.5-Plus, MiniMax-M2.5, Kimi-K2.5, GLM-5 have excellent performance in literature understanding, extraction, and summarization — fully practical for real workflows.
- **Cons**: Speed can be inconsistent. DeepSeek API integration is usable but V3.2 model performance significantly lags behind; using "reasoner" tier helps but may require patience. Third-party Antigravity quota support exists but carries account ban risk.
- **Verdict**: Best free/low-cost option if you have access to qualifying API keys or compatible subscriptions.

### Qwen Code

- **Pros**: Official OAuth login grants ~~**1,000 free daily calls**~~ to Qwen3.6-Plus — the free quota ended on April 15, 2026, but future official promotions may bring it back. Paired with Alibaba's Coding Plan, the Qwen series models deliver solid performance on literature tasks.
- **Cons**: Relatively less mature compared to other engines.
- **Verdict**: A solid choice when paired with Alibaba's Coding Plan.

### Gemini-CLI

- **Pros**: Free tier available.
- **Cons**: Slow startup, poor experience for interactive tasks. **Google has significantly reduced Pro subscription quotas**, making the cost-performance ratio generally poor.
- **Verdict**: Gemini-3-Flash remains a decent choice for simple tasks only.

### Claude Code

- **Pros**: Excellent instruction execution quality, stable output.
- **Cons**: Lower execution efficiency, more suited for code-related work.
- **Note**: Official Claude Code integration (official authentication + official models) has not been tested by the author — simply put, **no Anthropic subscription purchased**. Let's just say Anthropic is perhaps *too* "legally compliant" for certain regions 🤷.
- **Workaround**: This project provides convenient configuration entry points for third-party providers. Users with their own API keys or alternative provider access can configure accordingly.
- **BTW**: Using such an expensive subscription for this project feels a bit like overkill — official subscription recommended for **generous donors only**.
- **Verdict**: If you already have Claude access via other means, it works well — but the barrier to entry is higher than other options.

## 📋 Built-in Workflows

### Literature Workbench Package

A unified package for literature processing workflows:

| Workflow                  | Provider       | Description                                                                      |
| ------------------------- | -------------- | -------------------------------------------------------------------------------- |
| **Literature Digest**     | `skillrunner`  | Generate digest, references, and citation analysis notes from markdown or PDF    |
| **Literature Explainer**  | `skillrunner`  | Interactive conversation-based literature interpretation with conversation notes |
| **Export Notes**          | `pass-through` | Export custom notes (markdown/HTML) and literature-analysis generated artifacts    |
| **Import Notes**          | `pass-through` | Import markdown files as custom notes; supports multi-file selection             |
| **Reference Matching**    | `pass-through` | Match references to Better BibTeX citekeys, rewrite structured payloads          |
| **Reference Note Editor** | `pass-through` | Edit structured reference entries in a dedicated form dialog                     |

### Tag Vocabulary Package

Controlled vocabulary management workflows:

| Workflow           | Provider       | Description                                                              |
| ------------------ | -------------- | ------------------------------------------------------------------------ |
| **Tag Manager**    | `pass-through` | Controlled vocabulary CRUD, facet filtering, GitHub sync (subscribe/publish) |
| **Tag Regulator**  | `skillrunner`  | Normalize tags via LLM suggestions, import regulated tags to items       |

### Other Workflows

| Workflow             | Provider       | Description                                                  |
| -------------------- | -------------- | ------------------------------------------------------------ |
| **MinerU**           | `generic-http` | Parse PDFs, materialize markdown/assets, attach to parent items |
| **Workflow Debug Probe** | `pass-through` | Diagnostic workflow for troubleshooting runtime issues (Only visible in debug mode) |

## 📥 Installation

### Prerequisites

- [Zotero 7](https://www.zotero.org/download/) (version ≥ 6.999)
- For `skillrunner` workflows: a running [Skill-Runner](https://github.com/leike0813/Skill-Runner) instance

### Install Steps

1. Download the latest `.xpi` file from the [Releases](https://github.com/leike0813/Zotero-Skills/releases) page.
2. In Zotero → `Tools` → `Add-ons` → ⚙️ → `Install Add-on From File…`
3. Select the downloaded `.xpi` file and restart Zotero.

### Quick Start

#### 1. Deploy Skill-Runner (Prerequisite)

**One-Click Local Deploy** (Recommended for quick testing)

1. Open `Edit` → `Preferences` → `Zotero Skills` → `SkillRunner Local Runtime`
2. Click **Deploy** and wait for completion
3. The backend will be auto-configured

**Docker Deploy** (Recommended for production)

See [Skill-Runner](https://github.com/leike0813/Skill-Runner) for Docker deployment guide:

```bash
mkdir -p skills data
docker compose up -d --build
```

- **API**: http://localhost:9813/v1
- **Admin UI**: http://localhost:9813/ui

#### 2. Configure a Backend

_If not using one-click deploy_: Open `Edit` → `Preferences` → `Zotero Skills` → `Backend Manager`, add your Skill-Runner endpoint.

#### 3. Place Workflows

Copy workflow folders into the workflows directory (configurable in preferences).

#### 4. Use It

Right-click selected items → `Zotero-Skills` → choose a workflow.

## 🏗️ Architecture Overview

```
User Trigger
    │
    ▼
Selection Context ──► Workflow Engine ──► Provider Registry ──► Job Queue
                          │                     │                  │
                   workflow.json          backend profile     FIFO + concurrency
                   + hook scripts         resolution         control
                          │                     │                  │
                          ▼                     ▼                  ▼
                    Build Requests ──► Resolve Provider ──► Execute & Apply
                                                               │
                                                          Handlers:
                                                          note / tag /
                                                          attachment / item
```

The plugin cleanly separates:

- **Core Runtime** — lifecycle, execution pipeline, UI shell
- **Pluggable Layer** — workflow manifests, hook scripts, backend profiles
- **Result Handling** — handler API for Zotero item/note/tag/attachment operations

## 🧑‍💻 Development

```bash
# Install dependencies
npm install

# Start dev server (with mock Skill-Runner)
npm start

# Run tests (lite — fast feedback)
npm test

# Run full tests
npm run test:full

# Build for production
npm run build
```

See [Development Guide](doc/dev_guide.md) for detailed architecture and contribution guidelines.

## 📖 Documentation

| Document                                      | Description                                                  |
| --------------------------------------------- | ------------------------------------------------------------ |
| [Architecture Flow](doc/architecture-flow.md) | Execution pipeline overview with Mermaid diagrams            |
| [Development Guide](doc/dev_guide.md)         | Core components, config model, execution chain               |
| [Workflows](doc/components/workflows.md)      | Manifest schema, hooks, input filtering, execution semantics |
| [Providers](doc/components/providers.md)      | Provider contract system, request kinds                      |
| [Testing](doc/testing-framework.md)           | Dual-runner strategy, lite/full modes, CI gates              |

## 📄 License

[AGPL-3.0-or-later](LICENSE)

## 🙏 Acknowledgments

- Built on [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template) by [@windingwind](https://github.com/windingwind)
- Powered by [zotero-plugin-toolkit](https://github.com/windingwind/zotero-plugin-toolkit)
