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

**npx로 시작**을 활성화하면 명령이 `npx <package>` 형식으로 전환되고 Node.js 및 npm 설치가 필요하다는 안내가 표시됩니다. Codex, Claude Code, Factory Droid, Pi ACP, Amp ACP는 기본적으로 npx가 활성화되어 있으며, 다른 프리셋은 기본적으로 설치된 명령을 사용합니다. npx를 활성화하면 프로필 표시 이름에 `(npm)` 접미사가 추가됩니다.

**npx로 시작**을 비활성화하면 프리셋의 이름이 지정된 실행 파일이 시작되며, 이 파일은 미리 설치되어 있어야 합니다(예: `gemini`, `copilot`, `opencode`, `kimi`). npx 옵션이 없는 프리셋은 항상 설치된 CLI를 사용합니다: Hermes, 네이티브 Cursor(`agent`), Mistral Vibe, OpenHands, Goose, Junie, Kiro CLI, Oh My Pi. Pi ACP와 Amp ACP는 어댑터이므로 기반이 되는 Pi 및 Amp 에이전트 CLI도 설치하고 인증해야 합니다. Oh My Pi는 Bun 기반입니다. npx를 활성화하려면 Node.js와 npm이 필요합니다.

**격리 환경**은 격리를 지원하는 Agent에서만 사용할 수 있습니다. 활성화하면 플러그인이 미리보기에 문서화된 격리 환경 변수 또는 세션 디렉토리 인자를 주입하고, 해당 디렉토리에서 Agent 옵션과 인증을 직접 관리해야 한다는 안내를 표시합니다. 격리를 활성화하면 프로필 표시 이름에 `(Isolated)` 접미사가 추가됩니다.

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/backends/backend-manager_ACP-preset.webp" alt="ACP 프리셋 대화상자" title="ACP 프리셋 대화상자" loading="lazy" /><figcaption>ACP 프리셋 대화상자</figcaption></figure>

<!-- prettier-ignore -->
| 프리셋 | 기본 명령 | 설명 |
| --- | --- | --- |
| **OpenCode** | `opencode acp` | OpenCode ACP 백엔드; `OPENCODE_CONFIG_CONTENT`를 주입하여 권한 질문을 거부하고 `OPENCODE_CONFIG_DIR`를 통한 구성 디렉토리 격리 지원 |
| **Codex** | `npx -y @agentclientprotocol/codex-acp@latest` | OpenAI Codex용 ACP 어댑터 |
| **Claude Code** | `npx -y @agentclientprotocol/claude-agent-acp@latest` | Claude Code용 ACP 어댑터 |
| **Gemini CLI** | `gemini --acp` | Gemini CLI ACP 모드 |
| **Hermes** | `hermes acp` | Hermes Agent ACP 백엔드 |
| **Qwen Code** | `qwen --acp` | Qwen Code ACP 모드; `QWEN_HOME`를 통한 구성 디렉토리 격리 지원 |
| **GitHub Copilot** | `copilot --acp --stdio` | GitHub Copilot CLI ACP 모드; `COPILOT_HOME`을 통한 구성 디렉토리 격리 지원 |
| **Qoder CLI** | `qoder --acp` | Qoder CLI ACP 모드; `QODER_CONFIG_DIR`를 통한 문서화된 구성 디렉토리 격리 지원 |
| **Cursor Agent ACP** | `cursor-agent-acp` | Cursor Agent ACP 어댑터; `--session-dir`를 통한 문서화된 세션 디렉토리 격리 지원 |
| **DeepAgents** | `deepagents-acp` | DeepAgents ACP 어댑터 |
| **Auggie** | `auggie --acp` | Auggie ACP 모드 |
| **Kilo** | `kilo acp` | Kilo Code ACP 모드; `KILO_CONFIG_CONTENT`를 주입하여 권한 질문을 거부하며, 구성·데이터/session/auth/log·캐시 상태의 핵심 XDG 경로 격리가 확인되었습니다 |
| **Cline** | `cline --acp` | Cline ACP 모드; `CLINE_DIR`를 통한 구성 디렉토리 격리 지원 |
| **CodeBuddy** | `codebuddy --acp` | CodeBuddy ACP 모드; `CODEBUDDY_CONFIG_DIR`를 통한 구성 디렉토리 격리 지원 |
| **Grok** | `grok agent stdio` | Grok agent stdio 모드; `GROK_HOME`을 통한 home/구성 격리 지원 |
| **Cursor** | `agent acp` | Cursor Agent ACP 어댑터와 별개인 네이티브 Cursor ACP 진입점; `CURSOR_CONFIG_DIR`를 통한 구성 디렉토리 격리 지원 |
| **Kimi Code** | `kimi acp` | Kimi Code ACP 모드; `KIMI_CODE_HOME`을 통한 구성 디렉토리 격리 지원 |
| **MiniMax Code** | `mcode acp` | MiniMax Code ACP 모드; npx를 활성화하면 `@minimax-ai/code`의 `mcode` 실행 파일을 명시적으로 선택하며, 격리에는 `MINIMAX_DATA_DIR`를 사용합니다 |
| **Mistral Vibe** | `vibe-acp` | Mistral Vibe ACP 모드; `VIBE_HOME`을 통한 home/구성 격리 지원 |
| **OpenHands** | `openhands acp` | OpenHands ACP 모드; `OPENHANDS_PERSISTENCE_DIR`과 `OPENHANDS_CONVERSATIONS_DIR`로 영속성과 대화 저장소를 분리합니다 |
| **DeepSeek Harness** | `dsh --profile acp` | DeepSeek Harness ACP 모드; `DSH_HOME`을 통한 home/구성 격리 지원 |
| **Factory Droid** | `npx -y droid@latest exec --output-format acp-daemon` | Factory Droid ACP 데몬 모드; `DROID_DISABLE_AUTO_UPDATE`와 `FACTORY_DROID_AUTO_UPDATE_ENABLED`로 Droid 자동 업데이트를 비활성화합니다 |
| **Goose** | `goose acp` | Goose ACP 모드; `GOOSE_PATH_ROOT`를 통한 경로 루트 격리 지원 |
| **Junie** | `junie --acp=true` | Junie ACP 모드; `JUNIE_HOME`을 통한 home/구성 격리 지원 |
| **Kiro CLI** | `kiro-cli acp` | Kiro CLI ACP 모드 |
| **Pi ACP** | `npx -y pi-acp@latest` | Pi ACP 어댑터; Pi 코딩 에이전트 CLI가 필요하며 `PI_CODING_AGENT_DIR`를 통한 구성 디렉토리 격리를 지원합니다 |
| **Amp ACP** | `npx -y amp-acp@latest` | Amp ACP 어댑터; Amp CLI가 필요하며, 격리는 `AMP_ACP_STATE_DIR`를 통해 어댑터의 thread/session 상태만 이동합니다 |
| **Oh My Pi** | `omp acp` | Oh My Pi ACP 모드; Bun이 필요하며 설치된 명령으로만 제공됩니다 |

OpenCode, Codex, Claude Code, Gemini CLI, Qwen Code 및 Hermes Agent만 테스트되었습니다. 다른 ACP 백엔드의 사용 가능성은 백엔드 구현에 따라 다르며, 이 플러그인은 보장하지 않습니다. 문제가 발생하면 명령 인수 및 환경 변수를 직접 조정해 볼 수 있으며, ACP 프로토콜과 각 백엔드의 공식 문서를 기준으로 합니다.

프리셋 선택 후에도 모든 필드를 수동으로 수정할 수 있습니다.

## Environment Variable Configuration Recommendations

일부 Agent는 환경 변수나 명령 인자를 통해 구성 격리와 세션 지속성을 지원합니다. **격리 환경**을 활성화한 프리셋은 문서화된 값을 자동으로 주입합니다. 수동 프로필의 경우 해당 값을 직접 추가하세요.

격리는 선언된 파일 시스템 루트만 이동합니다. Amp ACP 격리는 adapter의 thread/session 상태만 대상으로 하며, Amp 구성과 자격 증명은 독립적으로 구성됩니다. 네이티브 Cursor 격리는 Cursor 구성 디렉토리를 대상으로 하며, `cursor-agent-acp` adapter의 세션 디렉토리와는 별개입니다. Copilot 자체 캐시와 Goose 키링은 주입 경로 밖에 남습니다.

OpenCode와 Kilo 프리셋은 항상 인라인 권한 구성을 함께 주입합니다. 각각 `OPENCODE_CONFIG_CONTENT`와 `KILO_CONFIG_CONTENT`이며, 값은 모두 `{"permission":{"question":"deny"}}`입니다. 프리셋을 추가한 뒤에는 이 값을 편집하거나 삭제할 수 있습니다.

<!-- prettier-ignore -->
| 설정 | Agent | 용도 |
| --- | --- | --- |
| `OPENCODE_CONFIG_DIR` | OpenCode | 독립 구성 디렉토리 지정 |
| `CODEX_HOME` | Codex | 독립 home/구성 디렉토리 지정 |
| `CLAUDE_CONFIG_DIR` | Claude Code | 독립 구성 디렉토리 지정 |
| `GEMINI_CLI_HOME` | Gemini CLI | 독립 구성 디렉토리 지정 |
| `HERMES_HOME` | Hermes Agent | 독립 home/구성 디렉토리 지정 |
| `QODER_CONFIG_DIR` | Qoder CLI | 독립 구성 디렉토리 지정 |
| `QWEN_HOME` | Qwen Code | 독립 home/구성 디렉토리 지정 |
| `COPILOT_HOME` | GitHub Copilot | 독립 구성 디렉토리 지정; Copilot 자체 캐시는 이 경로 밖에 남습니다 |
| `CLINE_DIR` | Cline | 독립 구성 디렉토리 지정 |
| `CODEBUDDY_CONFIG_DIR` | CodeBuddy | 독립 구성 디렉토리 지정 |
| `GROK_HOME` | Grok | 독립 home/구성 디렉토리 지정 |
| `CURSOR_CONFIG_DIR` | Cursor(네이티브 ACP) | 독립 구성 디렉토리 지정 |
| `KIMI_CODE_HOME` | Kimi Code | 독립 home/구성 디렉토리 지정 |
| `MINIMAX_DATA_DIR` | MiniMax Code | 독립 데이터 디렉토리 지정 |
| `VIBE_HOME` | Mistral Vibe | 독립 home/구성 디렉토리 지정 |
| `OPENHANDS_PERSISTENCE_DIR`, `OPENHANDS_CONVERSATIONS_DIR` | OpenHands | 독립 영속성 루트와 그 대화 저장소(`<root>/conversations`) 지정 |
| `DSH_HOME` | DeepSeek Harness | 독립 home/구성 디렉토리 지정 |
| `GOOSE_PATH_ROOT` | Goose | 독립 경로 루트 지정; Goose 키링은 이 경로 밖에 남습니다 |
| `JUNIE_HOME` | Junie | 독립 home/구성 디렉토리 지정 |
| `PI_CODING_AGENT_DIR` | Pi ACP | Pi coding agent의 독립 구성 디렉토리 지정 |
| `AMP_ACP_STATE_DIR` | Amp ACP | adapter의 thread/session 상태만 이동; Amp 구성과 자격 증명은 독립적으로 구성됩니다 |
| `--session-dir <path>` | Cursor Agent ACP | 독립 세션 지속성 디렉토리 지정 |
| `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_CACHE_HOME` | Kilo | 구성, 데이터/session/auth/log, 캐시 상태의 독립 XDG 루트 지정. 이는 확인된 핵심 상태 경로를 포괄하지만, 모든 Kilo 하위 명령이나 플러그인이 전역 디렉토리를 회피함을 증명하지는 않습니다. |

## 무료 모델 옵션

여러 엔진이 **무료 모델 액세스**를 제공합니다 — 비용 없이 시작하기에 이상적입니다：

| 엔진                      | 무료 옵션            | 작동 방식                                                                                                                                                                 |
| ------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kilo Code**             | Auto Free 모드       | Kilo Code의 내장 Auto Free 모드는 각 요청을 적절한 무료 모델로 자동 라우팅합니다. Kilo Code 설정에서 활성화 — API 키 불필요                                               |
| **OpenCode Zen**          | 내장 무료 모델       | [OpenCode Zen](https://opencode.ai/zen) 에디션은 API 구독 없이 내장 무료 모델 액세스를 포함합니다                                                                         |
| **OpenCode + OpenRouter** | OpenRouter 무료 모델 | OpenCode에서 [OpenRouter](https://openrouter.ai/)를 사용하도록 설정하고 무료 등급 모델(예: Gemini 2.5 Flash, DeepSeek V3)을 선택합니다. 무료 OpenRouter 계정이 필요합니다 |

### 무료 등급 제한 사항

무료 모델은 가벼운 사용에는 충분하지만, 다음 제약 사항을 인지하세요：

| 제한 사항             | 예상되는 영향                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **속도 제한**         | 제공업체 부하에 따라 분당 5~20회 요청으로 제한될 수 있습니다. 일괄 처리가 크게 느려집니다                                             |
| **동시성**            | 일반적으로 단일 동시 요청으로 제한됩니다. 여러 워크플로를 동시에 실행하면 대기열에 쌓이거나 실패할 수 있습니다                        |
| **모델 가용성**       | 피크 시간대에 무료 모델 풀이 소진될 수 있습니다. 「모델 사용 불가」또는 「용량 초과」오류가 발생할 수 있습니다                        |
| **모델 교체**         | 제공업체가 사전 통지 없이 무료 모델을 조용히 교체(업그레이드 또는 다운그레이드)할 수 있습니다. 실행 간 출력 품질이 달라질 수 있습니다 |
| **SLA / 신뢰성 없음** | 무료 등급은 가동 시간을 보장하지 않습니다. 서비스가 일시적으로 중단되거나 종료될 수 있습니다                                          |

> 안정적인 일괄 처리나 프로덕션 사용이 필요한 경우, [OpenCode Go](https://opencode.ai/go?ref=SZDFT9GZKW)(월 $10) 또는 Coding Plan(Bailian, Zhipu 등)과 같은 유료 플랜을 고려하세요. 논문 한 편당 비용은 절약되는 시간에 비하면 미미합니다.

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
