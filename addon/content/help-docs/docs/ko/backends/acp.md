# ACP Backend Configuration

## What is ACP?

ACP (Agent Client Protocol) is a protocol for communicating with agent backends. Zotero Agents communicates with locally running agent processes (such as Codex, Claude Code, OpenCode, etc.) through the ACP protocol to enable conversations and skill execution.

The ACP backend is the **recommended** configuration method — as long as you have any ACP-compatible agent tool installed on your machine, you can use it directly with zero additional configuration.

## Why ACP First?

- **Zero configuration burden**: No need to deploy additional services; use the agent tools already on your machine
- **Automatic process management**: The plugin specifies the launch command in the configuration and automatically manages the agent process lifecycle
- **Multi-agent support**: Configure multiple different agent backends simultaneously and switch between them as needed
- **Configuration isolation**: Some agents (such as OpenCode and Codex) support isolating configuration directories and session persistence directories through environment variables

## Configuration Steps

1. Ensure you have at least one ACP-compatible agent CLI tool installed on your machine
2. Open **Tools → [Backend Manager](#doc/backends%2Fbackend-manager)**
3. Switch to the **ACP** tab
4. Select your agent tool from the **Add from Preset** dropdown, or click **Add ACP** to configure manually
5. Fill in the following fields:
   - **Display Name**: A friendly name (e.g., "My OpenCode")
   - **Command**: Command to start the ACP backend (presets auto-fill, but you can also modify manually)
   - **Arguments**: Additional arguments for the command (optional)
   - **Environment Variables**: Additional environment variables (optional, used for configuration isolation, etc.)
6. Click **Save** in the bottom-right corner

### Connection Verification

After saving, the plugin automatically detects the backend's capabilities:
- Checks if the command exists
- Connects and initializes
- Retrieves available models and modes
- Computes a configuration fingerprint to detect subsequent changes

If detection fails, verify that the agent CLI is installed correctly and the command format is correct.

## Supported Agent Presets

The plugin provides several built-in presets that you can select directly from the **Add from Preset** dropdown:

| Preset | Command | Description |
|--------|---------|-------------|
| **Codex** | `npx codex acp` | OpenAI's official Coding Agent |
| **Claude Code** | `npx @anthropic-ai/claude-code acp` | Anthropic's official CLI |
| **OpenCode** | `npx opencode-ai@latest acp` | General-purpose agent framework with environment variable isolation support |
| **Gemini CLI** | `npx @google/gemini-cli acp` | Google Gemini |
| **Hermes** | `npx hermes acp` | Hermes Agent |
| **Qwen Code** | `qwen-code acp` | Qwen Code |

You can still manually modify any field after selecting a preset.

## Environment Variable Configuration Recommendations

Some agents support configuration isolation and session persistence through environment variables; simply add them in the environment variable editor:

| Environment Variable | Agent | Purpose |
|---------------------|-------|---------|
| `OPENCODE_CONFIG` | OpenCode | Specify an independent configuration directory |
| `OPENCODE_SESSION_DIR` | OpenCode | Specify a session persistence directory |
| `CODEX_CONFIG_DIR` | Codex | Specify an independent configuration directory |

## Request Types

The ACP backend supports two request types:
- `acp.prompt.v1` — Conversational interaction (ACP Chat)
- `acp.skill.run.v1` — Skill execution (ACP Skills)

The same ACP backend can be used for both conversations and skill runs simultaneously.

## Session Management

- Each backend can have multiple sessions (conversations), which are persistently stored in the plugin database
- Different ACP backends can run simultaneously without interfering with each other
- Sessions can be managed in [ACP Chat](#doc/sidebar%2Facp-chat)

## Next Steps

After configuration is complete, you can:
- Chat with the backend in [Sidebar ACP Chat](#doc/sidebar%2Facp-chat)
- View ACP skill runs in the [Dashboard](#doc/dashboard)
- Use the ACP backend to execute tasks in the [Workflow List](#doc/workflows%2Findex)
