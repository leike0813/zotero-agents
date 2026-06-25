# Zotero Agents

A Zotero plugin for executing agent skills.

![Zotero Agents research workbench poster](/img/poster.png)

## What is Zotero Agents?

Zotero Agents turns Zotero into a personal research workbench for the age of intelligent agents. It connects your literature library, agent backends, workflows, knowledge graphs, and external tools, transforming literature analysis from one-off Q&A into a sustainable, auditable, and extensible research process.

The first layer of capability is **pluggable workflows**. Researchers can break down complex literature tasks into reusable processes: paper parsing, deep reading, citation analysis, tag normalization, literature search, topic synthesis, review material generation, and more. Workflows can connect to different agent or service backends, leveraging agents' long-context understanding, tool calling, and multi-step reasoning to automate literature management and analysis workflows that would otherwise require repetitive manual operations, and to expand as research needs evolve.

The second layer is the **Assistant Sidebar**. It provides a coding-agent-style conversational interaction experience, supporting connections to various agent backends via the ACP protocol, as well as executing specific workflows through the Skill-Runner backend. You can ask agents to answer questions, analyze papers, search for related work, add references to your library based on the current item, selected literature, or the entire library, and continue conversations, confirmations, corrections, and progress tracking during long-running tasks.

The third layer is the **Synthesis Workbench**. It targets library-level, long-term knowledge building, consolidating digests, references, citation semantics, tags, concepts, and topic relationships generated from individual paper analyses into a unified knowledge platform. Researchers can manage reference networks here, review citation matches, explore citation graphs, organize literature around topics, and use Topic Synthesis to梳理 the foundational literature, cutting-edge work, key arguments, methodological disagreements, coverage gaps, and future directions of a research area. Its goal is to transform extensive reading into structured material suitable for reviews, thesis proposals, paper introductions, and research roadmap design.

The fourth layer is the **Host Bridge**. Through the `zotero-bridge` CLI and MCP service, external agents can directly interact with the Zotero library: read literature context, search items, add new references, invoke analysis tasks, and write back structured results. With agent workflows like OpenClaw and Hermes, you can delegate literature search, filtering, analysis, summarization, and review drafting, allowing long-running research tasks to progress continuously in the background.

The core value of Zotero Agents is making the Zotero library a research environment where agents can genuinely work. Every reading, analysis, review, and writing preparation step can be accumulated as knowledge for the next phase of research.

> **Supported Zotero Versions**: This plugin supports Zotero 7 and Zotero 9. Primary development and testing are done on Zotero 9. Zotero 8 is theoretically fully supported (the plugin framework is unchanged between 8/9). Zotero 7 should also work in theory but has not been thoroughly tested; future maintenance will focus on Zotero 9. Zotero 7 users encountering issues should report them on [Issues](https://github.com/leike0813/zotero-agents/issues).

:::tip Tip
The plugin ships with **no built-in business logic**. All workflows are provided through separate **official workflow packages** that users must download and install after installing the plugin. See the [Installation Guide](/installation) for details.
:::

## Features

- **⚙️ Backend Management** — Supports ACP, Skill-Runner, and Generic HTTP backend types
- **🔧 Workflow System** — Define multi-step automated processing pipelines
- **📊 Dashboard** — Monitor task status, browse history, and inspect logs
- **🖥️ Sidebar Panel** — Interact with backends without leaving your current work context
- **📖 Built-in Markdown Reader** — Double-click `.md` attachments to open in Zotero, with outline, search, math rendering, and code highlighting
- **💬 ACP Chat** — AI conversation with literature as context
- **🔬 Synthesis Workbench** — Deep literature analysis platform
- **🏷️ Tags Management** — Controlled tag vocabulary and automatic tagging
- **📈 Citation Graph** — Citation relationship visualization and analysis
- **📝 Topic Synthesis** — Automated topic analysis and report generation

## Quick Links

- [Installation Guide](/installation) — Install the plugin and its dependencies
- [Getting Started](/getting-started) — Configure your first backend and run a skill
- [Backend Configuration](/backends/) — Learn about the three supported backend types

## Documentation

| Section | Description |
|---------|-------------|
| [Installation Guide](/installation) | Plugin installation, official workflow package installation, Skill-Runner backend deployment |
| [Built-in Markdown Reader](/markdown-reader) | Double-click `.md` files to open in Zotero, with outline, search, and math rendering |
| [Backend Configuration](/backends/) | Configuration guide for ACP, Skill-Runner, and Generic HTTP backends |
| [Workflow](/workflows/) | Workflow introduction and invocation guide |
| [Dashboard](/dashboard) | Central monitoring panel usage guide |
| [Sidebar & ACP Chat](/sidebar/) | Sidebar panel and conversation features |
| [Synthesis Workbench](/synthesis/) | Synthesis workbench usage guide |
| [Preferences](/preferences) | Plugin settings reference |

## Project Resources

- [GitHub Repository](https://github.com/leike0813/zotero-agents)
- [Issue Tracker](https://github.com/leike0813/zotero-agents/issues)
- [Gitee Mirror](https://gitee.com/leike0813/zotero-agents)
