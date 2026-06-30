# Skill-Runner Deployment & Configuration

## What is Skill-Runner?

Skill-Runner is a standalone agent skill execution service. Zotero Agents communicates with Skill-Runner through the HTTP API to submit skill requests and retrieve results. It supports multiple AI agent CLIs as backend engines and can be deployed as an independent Docker container or local service.

> **🏆 Recommendation Priority**: If you already have an ACP-compatible agent tool on your machine (Codex, OpenCode, Claude Code, etc.), please use the [ACP backend](#doc/backends%2Facp) first, which requires zero additional configuration. Skill-Runner is suitable for scenarios requiring a persistent background service or LAN sharing.

## Deployment Modes

### Recommended: Docker Persistent Deployment

A Docker-deployed Skill-Runner runs as an independent persistent service, **unaffected by Zotero's start/stop** — closing Zotero allows tasks to continue running in the background, and on next Zotero launch you can resume or directly retrieve completed results.

Suitable for:
- Long-running tasks (Topic Synthesis, batch literature analysis, etc.)
- Sharing a single Skill-Runner instance across multiple devices on a LAN
- Users with Docker experience

#### docker compose (Recommended) {#recommended-docker-persistent-deployment}

```yaml
version: "3"
services:
  skill-runner:
    image: leike0813/skill-runner:latest
    ports:
      - "9813:9813"
      - "17681:17681"
    volumes:
      - ./skills:/app/skills
      - skillrunner_cache:/opt/cache
      - ./data:/app/data
    environment:
      - SKILL_RUNNER_DATA_DIR=/app/data
      - UI_BASIC_AUTH_ENABLED=false

volumes:
  skillrunner_cache:
```

```bash
mkdir -p data skills
docker compose up -d --build
```

After startup:
- **API Service**: `http://localhost:9813/v1`
- **Management UI**: `http://localhost:9813/ui`

#### Docker Direct Run

```bash
docker run --rm -p 9813:9813 -p 17681:17681 \
  -v "$(pwd)/skills:/app/skills" \
  -v skillrunner_cache:/opt/cache \
  -v "$(pwd)/data:/app/data" \
  leike0813/skill-runner:latest
```

Port descriptions:

| Port | Purpose |
|------|---------|
| `9813` | HTTP API + Management UI |
| `17681` | In-browser inline engine terminal (requires ttyd) |

#### Production Configuration

For public deployments, it is recommended to enable UI Basic Auth:

```bash
docker run --rm -p 9813:9813 \
  -v "$(pwd)/skills:/app/skills" \
  -e UI_BASIC_AUTH_ENABLED=true \
  -e UI_BASIC_AUTH_USERNAME=admin \
  -e UI_BASIC_AUTH_PASSWORD=your-password \
  leike0813/skill-runner:latest
```

It is recommended to use this with an HTTPS reverse proxy (such as Nginx).

### Emergency: One-click Local Mode Deployment

> ⚠️ This mode is only suitable for users who **have no knowledge of how to install agent tools and cannot use Docker**. If you are capable of installing agent CLIs or using Docker, please prefer the [ACP backend](#doc/backends%2Facp) or the Docker deployment above.

The one-click deployed Skill-Runner starts and stops automatically with the Zotero plugin — **closing Zotero terminates all currently executing tasks**, and there is no background execution. Interrupted tasks need to be resubmitted.

**Deployment Steps:**

1. Open **Zotero → Settings → Zotero Agents**
2. Find the **SkillRunner Local Backend** section
3. Click **One-click Deploy** (if not yet installed)
   - The plugin automatically downloads the latest version from GitHub Releases
   - Installs to the plugin data directory
   - Status changes to "Installed" upon completion
4. Click **Start**
   - Default address: `http://127.0.0.1:29813`
   - If the port is occupied, it automatically tries the next 10 ports

**Action Button Descriptions:**

| Button | Function |
|--------|----------|
| Deploy | Download and install the Skill-Runner runtime |
| Start | Start the local Skill-Runner process |
| Stop | Stop the running Skill-Runner process |
| Uninstall | Remove the installed runtime files |
| Open Management UI | Open the Skill-Runner built-in Web management interface in the sidebar |
| Open Skills Folder | Open the directory where skill files are stored |
| Refresh Model Cache | Refresh the backend model list cache |
| Open Debug Console | View backend log output |

### Remote Mode

Connect to a remote or cloud-hosted Skill-Runner instance.

> ⚠️ **Security Notice**: The current version does not provide additional security protection for remote connections (such as TLS, API key verification, etc.), relying only on Bearer Token authentication. **Remote connections are not recommended in non-LAN environments**. When deploying within a LAN, it is recommended to use a firewall to restrict access sources.

**Configuration Steps:**

1. Open **Tools → [Backend Manager](#doc/backends%2Fbackend-manager)**
2. Switch to the **SkillRunner** tab
3. Click **Add SkillRunner**
4. Fill in:
   - **Display Name**: A friendly name
   - **Base URL**: Remote instance address (e.g., `http://192.168.1.100:9813`)
   - **Authentication**: Select `bearer` and fill in the **Auth Token** (if the backend requires authentication)
   - **Timeout**: Request timeout (optional)
5. Click **Save** in the bottom-right corner

## Local Deployment (Without Docker)

### Quick Deployment Script

```bash
# Linux / macOS
./scripts/deploy_local.sh

# Windows (PowerShell)
.\scripts\deploy_local.ps1
```

Prerequisites: `uv`, `Node.js`, `npm`. `ttyd` is optional.

### Control CLI

```bash
# Check status
./scripts/skill-runnerctl status --mode local --json

# Start
./scripts/skill-runnerctl up --mode local --json

# Stop
./scripts/skill-runnerctl down --mode local --json
```

Local mode default parameters:
- **Linux/macOS**: `$HOME/.local/share/skill-runner`
- **Windows**: `%LOCALAPPDATA%\SkillRunner`
- **Port**: `29813` (fallback `29813-29823`)
- **Bind**: `127.0.0.1` only

### Release Installer

```bash
# Linux / macOS
./scripts/skill-runner-install.sh --version v0.4.3

# Windows (PowerShell)
.\scripts\skill-runner-install.ps1 -Version v0.4.3
```

The script automatically downloads `skill-runner-<version>.tar.gz` + `.sha256` and verifies SHA256 integrity before installation.

## Engine System

Skill-Runner supports multiple AI agent CLIs as execution engines and provides a unified adaptation layer.

### Supported Engines

| Engine | Package Name |
|--------|-------------|
| Codex | `@openai/codex` |
| Gemini CLI | `@google/gemini-cli` |
| OpenCode | `opencode-ai` |
| Claude Code | `@anthropic-ai/claude-code` |
| Qwen | `@qwen-code/qwen-cli` |

### Configuration Priority

Engine configuration is merged from four layers (low → high):

1. **Engine Defaults**: Default configuration built into the engine adapter
2. **Skill Recommended Values**: Recommended configuration from the skill package `assets/<engine>_config.*`
3. **User Options**: Parameters from the API request body
4. **Forced Configuration**: Forced configuration from the engine adapter (cannot be overridden)

### Engine Authentication

| Method | Description | Recommendation |
|--------|-------------|----------------|
| **OAuth Proxy** | Complete OAuth through the management UI; credentials are stored automatically | ⭐ Recommended |
| **CLI Delegation** | Use the engine's built-in local login flow | Alternative |
| **Inline TUI** | Engine terminal in the browser (requires ttyd) | For debugging |
| **Import Credential File** | Upload credential files through the UI | Alternative |
| **Container CLI Login** | Run CLI login directly via `docker exec` | For container environments |

## Management UI

The built-in Web management interface provides full operational capabilities for Skill-Runner.

Access URL: `http://localhost:<port>/ui`

| Feature | Description |
|---------|-------------|
| **Skill Browser** | View installed skills, inspect package structure and file contents |
| **Engine Management** | Monitor engine status, trigger upgrades, view engine logs |
| **Model Catalog** | Browse and manage engine model snapshots |
| **Inline TUI** | Launch engine terminals directly in the browser (requires ttyd) |
| **Settings** | Log level, data retention period, maximum directory size, etc. |

## REST API Overview

### Core Execution Endpoints

```bash
# List available skills
curl http://localhost:9813/v1/skills

# Create a job (execute a skill)
curl -X POST http://localhost:9813/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "skill_id": "my-skill",
    "engine": "gemini",
    "parameter": { "language": "zh-CN" },
    "model": "gemini-3-pro-preview"
  }'

# Get results
curl http://localhost:9813/v1/jobs/<request_id>/result

# Cancel a job
curl -X POST http://localhost:9813/v1/jobs/<request_id>/cancel
```

### Real-time Monitoring (SSE)

Two SSE channels for real-time observation of the execution process:

| Channel | Endpoint | Purpose |
|---------|----------|---------|
| Chat | `GET /v1/jobs/{id}/chat?cursor=N` | Chat bubble stream |
| Events | `GET /v1/jobs/{id}/events?cursor=N` | Full protocol event stream |

Both channels support cursor-based reconnection after disconnection.

### Management API

Stable JSON management endpoints suitable for frontend integration:

| Endpoint | Purpose |
|----------|---------|
| `GET /v1/management/skills` | Skill summary |
| `GET /v1/management/engines` | Engine status |
| `GET /v1/management/runs` | Run history (paginated) |
| `GET /v1/management/runs/{id}/chat` | Conversation SSE stream |
| `POST /v1/management/runs/{id}/reply` | Submit a reply to an interactive skill |
| `POST /v1/management/runs/{id}/cancel` | Cancel a run |

### Local Runtime Lease API

Local runtime mode uses lease-based lifecycle management:

| Endpoint | Purpose |
|----------|---------|
| `POST /v1/local-runtime/lease/acquire` | Acquire a lease |
| `POST /v1/local-runtime/lease/heartbeat` | Renew lease (TTL: 60s) |
| `POST /v1/local-runtime/lease/release` | Release the lease |

The local runtime automatically terminates when the lease expires.

## Skill Package Management

### Persistent Installation

```bash
# Upload a skill package zip
curl -X POST http://localhost:9813/v1/skill-packages/install \
  -H "Content-Type: multipart/form-data" \
  -F "file=@my-skill.zip"
```

Server-side validation rules:
- The package must contain a top-level directory
- Must have `SKILL.md` + `assets/runner.json`
- Must have three schema files (input / parameter / output)
- Directory name == `runner.json.id` == `SKILL.md` frontmatter name (identity consistency)
- Updates must be strictly version-increasing

### Temporary Run (No Installation)

```bash
# Create a temporary run
curl -X POST http://localhost:9813/v1/temp-skill-runs \
  -H "Content-Type: application/json" \
  -d '{ "engine": "gemini", "parameter": {} }'

# Upload a skill package and start
curl -X POST http://localhost:9813/v1/temp-skill-runs/<id>/upload \
  -F "skill_package=@my-skill.zip"
```

Temporary runs are automatically cleaned up after reaching a terminal state.

## Execution Lifecycle

A typical skill execution includes the following stages:

```
1. Setup & Upload
   └── Client submits POST /v1/jobs
       └── Optionally uploads input files

2. Orchestration
   └── Load skill manifest
       └── Validate parameter schema
       └── Check engine compatibility
       └── Apply concurrency limits

3. Engine Adaptation
   └── Prepare environment (copy skill package)
       └── Parse input files
       └── Build prompt via Jinja2 templates
       └── Set run directory trust

4. Execution
   └── Engine CLI starts as a subprocess
       └── Isolated working directory
       └── stdout/stderr streamed in real-time

5. Completion
   └── Output validation (against output.schema.json)
       └── Parse artifact files
       └── Generate Bundle (zip + manifest)
       └── Status set to succeeded / failed / canceled
```

When a run fails, the debug bundle contains complete logs and diagnostic files.

## Data Directory Structure

```
data/
├── runs/<run_id>/              # Run workspace
│   ├── .state/state.json       # Run state
│   ├── .audit/                 # Audit logs
│   ├── result/result.json      # Final structured output
│   ├── artifacts/              # Skill-generated files
│   └── bundle/                 # Packaged results (zip + manifest)
├── requests/<request_id>/      # Request-phase data
│   ├── uploads/                # Uploaded input files
│   └── request.json            # Original request parameters
├── logs/                       # Application logs (rotated daily)
└── system_settings.json        # UI-editable system settings
```

## Environment Variable Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `SKILL_RUNNER_DATA_DIR` | Run data directory | `./data` |
| `SKILL_RUNNER_AGENT_HOME` | Agent isolated configuration home directory | `auto` |
| `SKILL_RUNNER_RUNTIME_MODE` | Runtime mode: local / container | `auto` |
| `UI_BASIC_AUTH_ENABLED` | Enable UI Basic Auth | `false` |
| `UI_BASIC_AUTH_USERNAME` | Basic Auth username | — |
| `UI_BASIC_AUTH_PASSWORD` | Basic Auth password | — |

## Run Status Descriptions

| Status | Description |
|--------|-------------|
| unknown | Initial state, not yet detected |
| starting | Starting up |
| running | Running normally |
| stopped | Stopped |
| degraded | Running abnormally |
| reconciling_after_heartbeat_fail | Heartbeat detection failed, recovering |

## Port Descriptions

- Default port: `29813` (plugin local range)
- Standalone deployment API port: `9813`
- Fallback range: 10 consecutive ports (29813–29822)
- Heartbeat interval: 20 seconds
- Auto-start detection: checks every 15 seconds

## Logs

Logs are written to `data/logs/skill_runner.log` (rotated daily). You can configure the log level, retention period, and maximum directory size through the management UI settings page.

On container startup, structured bootstrap diagnostic logs are also generated to `${SKILL_RUNNER_DATA_DIR}/logs/bootstrap.log` and `agent_bootstrap_report.json`.

## Next Steps

- [Learn about Workflows](#doc/workflows%2Findex) — Skill-Runner is one of the main backends for executing workflows
- [Dashboard Introduction](#doc/dashboard) — Monitor task execution status
- [SkillRunner Tab](#doc/sidebar%2Fskillrunner-tab) — View and interact with SkillRunner runs in the sidebar
