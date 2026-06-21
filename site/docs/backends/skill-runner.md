# Skill-Runner 部署与配置

## 什么是 Skill-Runner？

Skill-Runner 是一个独立的 Agent 技能执行服务。Zotero Agents 通过 HTTP API 与 Skill-Runner 通信，提交技能请求并获取结果。它本身是一个可以独立部署的 Docker 镜像或本地服务，支持多种 AI Agent CLI 作为后端引擎。

## 部署模式

### 托管本地模式（推荐）

Zotero 插件提供一键部署/启动/停止功能，自动管理 Skill-Runner 的生命周期。

**部署步骤：**

1. 打开 **Zotero → 设置 → Zotero Agents**
2. 找到 **SkillRunner Local Backend** 区域
3. 点击 **一键部署**（如果尚未安装）
   - 插件自动从 GitHub Release 下载最新版本
   - 安装到插件数据目录
   - 完成后状态变为"已安装"
4. 点击 **启动**
   - 默认地址：`http://127.0.0.1:29813`
   - 如果端口被占用，自动尝试后续 10 个端口

**操作按钮说明：**

| 按钮 | 功能 |
|------|------|
| 部署 | 下载并安装 Skill-Runner 运行时 |
| 启动 | 启动本地 Skill-Runner 进程 |
| 停止 | 停止正在运行的 Skill-Runner 进程 |
| 卸载 | 移除已安装的运行时文件 |
| 打开管理 UI | 在侧边栏中打开 Skill-Runner 内置 Web 管理界面 |
| 打开技能文件夹 | 打开存放技能文件的目录 |
| 刷新模型缓存 | 刷新后端模型列表缓存 |
| 打开调试控制台 | 查看后端日志输出 |

### 远程模式

连接到远程或云托管的 Skill-Runner 实例。

**配置步骤：**

1. 打开 **工具 → [后端管理器](backend-manager)**
2. 切换到 **SkillRunner** Tab
3. 点击 **添加 SkillRunner**
4. 填写：
   - **显示名称**：友好的名称
   - **Base URL**：远程实例地址（如 `https://skill-runner.example.com`）
   - **认证方式**：选择 `bearer` 并填写 **认证令牌**（如果后端需要认证）
   - **超时时间**：请求超时（可选）
5. 点击右下角 **保存**

## Docker 部署

Skill-Runner 可以独立部署为 Docker 容器，适合自托管或团队共享。

### docker compose（推荐）

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

启动后：
- **API 服务**：`http://localhost:9813/v1`
- **管理 UI**：`http://localhost:9813/ui`

### Docker 直接运行

```bash
docker run --rm -p 9813:9813 -p 17681:17681 \
  -v "$(pwd)/skills:/app/skills" \
  -v skillrunner_cache:/opt/cache \
  -v "$(pwd)/data:/app/data" \
  leike0813/skill-runner:latest
```

端口说明：

| 端口 | 用途 |
|------|------|
| `9813` | HTTP API + 管理 UI |
| `17681` | 浏览器内联引擎终端（需 ttyd） |

### 生产环境配置

对于公开部署，建议启用 UI Basic Auth：

```bash
docker run --rm -p 9813:9813 \
  -v "$(pwd)/skills:/app/skills" \
  -e UI_BASIC_AUTH_ENABLED=true \
  -e UI_BASIC_AUTH_USERNAME=admin \
  -e UI_BASIC_AUTH_PASSWORD=your-password \
  leike0813/skill-runner:latest
```

建议配合 HTTPS 反向代理（如 Nginx）使用。

## 本地部署（无 Docker）

### 快速部署脚本

```bash
# Linux / macOS
./scripts/deploy_local.sh

# Windows (PowerShell)
.\scripts\deploy_local.ps1
```

前提条件：`uv`、`Node.js`、`npm`。`ttyd` 为可选。

### 控制 CLI

```bash
# 查看状态
./scripts/skill-runnerctl status --mode local --json

# 启动
./scripts/skill-runnerctl up --mode local --json

# 停止
./scripts/skill-runnerctl down --mode local --json
```

本地模式默认参数：
- **Linux/macOS**：`$HOME/.local/share/skill-runner`
- **Windows**：`%LOCALAPPDATA%\SkillRunner`
- **端口**：`29813`（备用 `29813-29823`）
- **绑定**：仅 `127.0.0.1`

### 发布安装程序

```bash
# Linux / macOS
./scripts/skill-runner-install.sh --version v0.4.3

# Windows (PowerShell)
.\scripts\skill-runner-install.ps1 -Version v0.4.3
```

脚本自动下载 `skill-runner-<version>.tar.gz` + `.sha256`，安装前验证 SHA256 完整性。

## 引擎系统

Skill-Runner 支持多种 AI Agent CLI 作为执行引擎，并提供统一的适配层。

### 支持的引擎

| 引擎 | 包名 |
|------|------|
| Codex | `@openai/codex` |
| Gemini CLI | `@google/gemini-cli` |
| OpenCode | `opencode-ai` |
| Claude Code | `@anthropic-ai/claude-code` |
| Qwen | `@qwen-code/qwen-cli` |

### 配置优先级

引擎配置从四层合并（低→高）：

1. **引擎默认值**：引擎适配器内置的默认配置
2. **技能推荐值**：技能包 `assets/<engine>_config.*` 中的推荐配置
3. **用户选项**：API 请求体中的参数
4. **强制配置**：引擎适配器的强制配置（不可覆盖）

### 引擎认证

| 方式 | 说明 | 推荐度 |
|------|------|--------|
| **OAuth 代理** | 通过管理 UI 完成 OAuth，凭据自动存储 | ⭐ 推荐 |
| **CLI 委托** | 使用引擎内置的本地登录流程 | 备选 |
| **内联 TUI** | 浏览器中的引擎终端（需 ttyd） | 用于调试 |
| **导入凭证文件** | 通过 UI 上传凭据文件 | 备选 |
| **容器 CLI 登录** | 通过 `docker exec` 直接运行 CLI 登录 | 用于容器环境 |

## 管理 UI

内置 Web 管理界面提供对 Skill-Runner 的完整运维能力。

访问地址：`http://localhost:<port>/ui`

| 功能 | 说明 |
|------|------|
| **技能浏览器** | 查看已安装的技能，检查包结构和文件内容 |
| **引擎管理** | 监控引擎状态、触发升级、查看各引擎日志 |
| **模型目录** | 浏览和管理引擎模型快照 |
| **内联 TUI** | 在浏览器中直接启动引擎终端（需 ttyd） |
| **设置** | 日志级别、数据保留期、最大目录大小等 |

## REST API 概览

### 核心执行端点

```bash
# 列出可用技能
curl http://localhost:9813/v1/skills

# 创建作业（执行技能）
curl -X POST http://localhost:9813/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "skill_id": "my-skill",
    "engine": "gemini",
    "parameter": { "language": "zh-CN" },
    "model": "gemini-3-pro-preview"
  }'

# 获取结果
curl http://localhost:9813/v1/jobs/<request_id>/result

# 取消作业
curl -X POST http://localhost:9813/v1/jobs/<request_id>/cancel
```

### 实时监听（SSE）

两个 SSE 通道用于实时观察执行过程：

| 通道 | 端点 | 用途 |
|------|------|------|
| Chat | `GET /v1/jobs/{id}/chat?cursor=N` | 聊天气泡流 |
| Events | `GET /v1/jobs/{id}/events?cursor=N` | 完整协议事件流 |

两个通道都支持基于游标的断线重连。

### 管理 API

稳定的 JSON 管理端点，适合前端集成：

| 端点 | 用途 |
|------|------|
| `GET /v1/management/skills` | 技能摘要 |
| `GET /v1/management/engines` | 引擎状态 |
| `GET /v1/management/runs` | 运行历史（分页） |
| `GET /v1/management/runs/{id}/chat` | 对话 SSE 流 |
| `POST /v1/management/runs/{id}/reply` | 向交互式技能提交回复 |
| `POST /v1/management/runs/{id}/cancel` | 取消运行 |

### 本地运行时租约 API

本地运行模式使用基于租约的生命周期管理：

| 端点 | 用途 |
|------|------|
| `POST /v1/local-runtime/lease/acquire` | 获取租约 |
| `POST /v1/local-runtime/lease/heartbeat` | 续租（TTL: 60s） |
| `POST /v1/local-runtime/lease/release` | 释放租约 |

租约过期时本地运行时会自动终止。

## 技能包管理

### 持久安装

```bash
# 上传技能包 zip
curl -X POST http://localhost:9813/v1/skill-packages/install \
  -H "Content-Type: multipart/form-data" \
  -F "file=@my-skill.zip"
```

服务端校验规则：
- 包必须包含顶层目录
- 必须有 `SKILL.md` + `assets/runner.json`
- 必须有三个 schema 文件（input / parameter / output）
- 目录名 == `runner.json.id` == `SKILL.md` frontmatter name（身份一致性）
- 更新必须严格升版

### 临时运行（免安装）

```bash
# 创建临时运行
curl -X POST http://localhost:9813/v1/temp-skill-runs \
  -H "Content-Type: application/json" \
  -d '{ "engine": "gemini", "parameter": {} }'

# 上传技能包并启动
curl -X POST http://localhost:9813/v1/temp-skill-runs/<id>/upload \
  -F "skill_package=@my-skill.zip"
```

临时运行在终态后自动清理。

## 执行生命周期

一个典型的技能执行包含以下阶段：

```
1. 设置与上传
   └── 客户端提交 POST /v1/jobs
       └── 可选上传输入文件

2. 编排
   └── 加载技能清单
       └── 验证参数 schema
       └── 检查引擎兼容性
       └── 应用并发限制

3. 引擎适配
   └── 准备环境（复制技能包）
       └── 解析输入文件
       └── 通过 Jinja2 模板构建提示
       └── 设置运行目录信任

4. 执行
   └── 引擎 CLI 作为子进程启动
       └── 隔离工作目录
       └── stdout/stderr 实时流式传输

5. 完成
   └── 输出验证（针对 output.schema.json）
       └── 解析制品文件
       └── 生成 Bundle（zip + 清单）
       └── 状态设为 succeeded / failed / canceled
```

运行失败时，调试 Bundle 包含完整日志和诊断文件。

## 数据目录结构

```
data/
├── runs/<run_id>/              # 运行工作区
│   ├── .state/state.json       # 运行状态
│   ├── .audit/                 # 审计日志
│   ├── result/result.json      # 最终结构化输出
│   ├── artifacts/              # 技能生成的文件
│   └── bundle/                 # 打包结果（zip + 清单）
├── requests/<request_id>/      # 请求阶段数据
│   ├── uploads/                # 上传的输入文件
│   └── request.json            # 原始请求参数
├── logs/                       # 应用日志（按天轮转）
└── system_settings.json        # UI 可编辑的系统设置
```

## 环境变量参考

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SKILL_RUNNER_DATA_DIR` | 运行数据目录 | `./data` |
| `SKILL_RUNNER_AGENT_HOME` | Agent 隔离配置主目录 | `auto` |
| `SKILL_RUNNER_RUNTIME_MODE` | 运行模式：local / container | `auto` |
| `UI_BASIC_AUTH_ENABLED` | 启用 UI Basic Auth | `false` |
| `UI_BASIC_AUTH_USERNAME` | Basic Auth 用户名 | — |
| `UI_BASIC_AUTH_PASSWORD` | Basic Auth 密码 | — |

## 运行状态说明

| 状态 | 说明 |
|------|------|
| unknown | 初始状态，尚未检测 |
| starting | 正在启动 |
| running | 正常运行 |
| stopped | 已停止 |
| degraded | 运行异常 |
| reconciling_after_heartbeat_fail | 心跳检测失败，正在恢复 |

## 端口说明

- 默认端口：`29813`（插件本地区域）
- 独立部署 API 端口：`9813`
- 回退范围：连续 10 个端口（29813-29822）
- 心跳间隔：20 秒
- 自动启动检测：每 15 秒检查一次

## 日志

日志写入 `data/logs/skill_runner.log`（按天轮转）。可以通过管理 UI 的设置页面配置日志级别、保留期和最大目录大小。

容器启动时还会生成结构化的引导诊断日志到 `${SKILL_RUNNER_DATA_DIR}/logs/bootstrap.log` 和 `agent_bootstrap_report.json`。

## 下一步

- [了解 Workflow](../workflows/) — Skill-Runner 是执行 Workflow 的主要后端
- [Dashboard 介绍](../dashboard) — 监控任务运行状态
- [SkillRunner Tab](../sidebar/skillrunner-tab) — 在侧边栏中查看和交互 SkillRunner 运行
