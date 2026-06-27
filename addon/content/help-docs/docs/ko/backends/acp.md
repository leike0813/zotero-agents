# ACP Backend Configuration

## What is ACP?

ACP (Agent Client Protocol) is a protocol for communicating with agent backends. Zotero Agents communicates with locally running agent processes (such as Codex, Claude Code, OpenCode, etc.) through the ACP protocol to enable conversations and skill execution.

The ACP backend is the **recommended** configuration method — as long as you have any ACP-compatible agent tool installed on your machine, you can use it directly with zero additional configuration.

## Agent가 처음이신가요?

Agent 도구를 처음 사용하시고 어떤 것을 선택하거나 설치해야 할지 잘 모르시겠다면, 다음 가이드를 참고하세요:

**[Agent 시작 가이드](https://agent.ps5.online)**

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

## 지원되는 Agent 프리셋

이 플러그인은 여러 내장 프리셋을 제공합니다. **프리셋에서 추가**를 클릭하면 왼쪽에서 Agent를 선택하고 오른쪽에 시작 옵션과 읽기 전용 구성 미리보기가 표시됩니다.

**npx로 시작**을 활성화하면 명령이 `npx <package>` 형식으로 전환되고 Node.js 및 npm 설치가 필요하다는 안내가 표시됩니다. Codex와 Claude Code는 ACP 어댑터에 의존하므로 기본적으로 npx가 활성화되어 있으며, 다른 Agent는 기본적으로 원시 명령을 사용합니다. npx를 활성화하면 프로필 표시 이름에 `(npm)` 접미사가 추가됩니다.

**격리 환경**은 격리를 지원하는 Agent에서만 사용할 수 있습니다. 활성화하면 플러그인이 미리보기에 문서화된 격리 환경 변수 또는 세션 디렉토리 인자를 주입하고, 해당 디렉토리에서 Agent 옵션과 인증을 직접 관리해야 한다는 안내를 표시합니다. 격리를 활성화하면 프로필 표시 이름에 `(Isolated)` 접미사가 추가됩니다.

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/backends/backend-manager_ACP-preset.webp" alt="ACP 프리셋 대화상자" title="ACP 프리셋 대화상자" loading="lazy" /><figcaption>ACP 프리셋 대화상자</figcaption></figure>

| 프리셋 | 기본 명령 | 설명 |
|------|------|------|
| **OpenCode** | `opencode acp` | OpenCode ACP 백엔드; `OPENCODE_CONFIG_DIR`를 통한 구성 디렉토리 격리 지원 |
| **Codex** | `npx @zed-industries/codex-acp@latest` | OpenAI Codex용 ACP 어댑터 |
| **Claude Code** | `npx @agentclientprotocol/claude-agent-acp@latest` | Claude Code용 ACP 어댑터 |
| **Gemini CLI** | `gemini --experimental-acp` | Gemini CLI ACP 모드 |
| **Hermes** | `hermes acp` | Hermes Agent ACP 백엔드 |
| **Qwen Code** | `qwen --acp --experimental-skills` | Qwen Code ACP 모드 |
| **GitHub Copilot** | `copilot --acp --stdio` | GitHub Copilot CLI ACP 모드 |
| **Qoder CLI** | `qodercli --acp` | Qoder CLI ACP 모드; `QODER_CONFIG_DIR`를 통한 구성 디렉토리 격리 지원 |
| **Cursor Agent ACP** | `cursor-agent-acp` | Cursor Agent ACP 어댑터; `--session-dir`를 통한 세션 디렉토리 격리 지원 |
| **DeepAgents** | `deepagents-acp` | DeepAgents ACP 어댑터 |
| **Auggie** | `auggie --acp` | Auggie ACP 모드 |
| **Kilo** | `kilo acp` | Kilo Code ACP 모드 |
| **Cline** | `cline --acp` | Cline ACP 모드 |
| **CodeBuddy** | `codebuddy --acp` | CodeBuddy ACP 모드 |
| **Grok** | `grok agent stdio` | Grok agent stdio 모드 |

OpenCode, Codex, Claude Code, Gemini CLI, Qwen Code 및 Hermes Agent만 테스트되었습니다. 다른 ACP 백엔드의 사용 가능성은 백엔드 구현에 따라 다르며, 이 플러그인은 보장하지 않습니다. 문제가 발생하면 명령 인수 및 환경 변수를 직접 조정해 볼 수 있으며, ACP 프로토콜과 각 백엔드의 공식 문서를 기준으로 합니다.

프리셋 선택 후에도 모든 필드를 수동으로 수정할 수 있습니다.

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
