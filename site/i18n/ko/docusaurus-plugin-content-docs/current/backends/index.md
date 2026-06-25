# Backend Configuration Overview

Zotero Agents supports three backend types, each suited for different use cases.

## How to Choose

### 🥇 First Choice: ACP Backend

If you already have any ACP-compatible agent tool installed on your machine (Codex, Claude Code, OpenCode, Hermes Agent, OpenClaw, Qwen Code, etc.), you can use the ACP backend directly. **Zero additional configuration burden** — simply select the corresponding agent from the preset list in the Backend Manager, and the plugin handles process lifecycle management automatically.

Some agents (such as OpenCode and Codex) also support isolating configuration directories and session persistence directories through environment variables, making it easy to manage multiple work contexts.

→ [ACP Backend Configuration](./acp)

### 🥈 Second Choice: Docker-deployed Skill-Runner

If you need **persistent background execution** (tasks continue running after Zotero is closed, and you can resume or retrieve results on next launch), or you have the ability to set up a server on your local network, it is recommended to deploy Skill-Runner with Docker as a persistent service.

A Docker-deployed Skill Runner runs independently of Zotero and supports multi-user sharing, a Web management UI, engine management, and more.

→ [Skill-Runner Deployment & Configuration](./skill-runner)

### 🥉 Emergency Only: One-click Local Skill-Runner Deployment

This is only suitable for users who **have no knowledge of how to install and configure agent tools and cannot use Docker**. One-click deployment starts and stops with the plugin — closing Zotero terminates all tasks, and there is no background execution. If you are capable of installing agents or using Docker, please prefer the two options above.

→ [Skill-Runner Deployment & Configuration](./skill-runner)

### Generic HTTP

Used for calling specific HTTP APIs (such as the MinerU document parsing service) that do not involve AI model execution. Configure as needed.

→ [Generic HTTP Backend Configuration](./generic-http)

## Backend Type Comparison

| Type | Protocol | Execution Mode | Recommendation | Use Case |
|------|----------|---------------|----------------|----------|
| **ACP Backend** | Agent Client Protocol | Local subprocess | 🥇 First choice | You have an ACP agent tool, zero configuration burden |
| **Skill-Runner (Docker)** | HTTP API | Persistent service | 🥈 Recommended | Need persistent background execution, LAN sharing |
| **Skill-Runner (One-click)** | HTTP API | Starts/stops with plugin | 🥉 Emergency | Cannot install agents / Docker at all |
| **Generic HTTP** | HTTP | Remote service | As needed | Calling specific HTTP APIs (e.g., MinerU) |

All backends are configured through **[Tools → Backend Manager](backend-manager)**.

## Next Steps

- [ACP Backend Configuration](acp)
- [Skill-Runner Deployment & Configuration](skill-runner)
- [Generic HTTP Backend Configuration](generic-http)
- [Backend Manager Usage Guide](backend-manager)
