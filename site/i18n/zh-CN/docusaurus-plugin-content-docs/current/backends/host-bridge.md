# Host Bridge

## 概述

Host Bridge 是插件内嵌的 HTTP 服务器，让外部 AI 工具（Codex、Claude Code、OpenCode 等）可以直接访问你的 Zotero 文献库。它是 ACP Agent 与 Zotero 之间的通信桥梁，也是 `zotero-bridge` CLI 和 MCP Server 的底层传输层。

## 架构

```
Zotero 插件进程
│
├── Host Bridge HTTP Server（loopback: 127.0.0.1:<port>）
│     ├── Bearer Token 认证（每次请求）
│     ├── 写入审批闸门（按 operation 级别）
│     └── 能力路由器（30+ capability）
│
└── zotero-bridge CLI（配套二进制）
      ├── 语义化命令（context、library、mutation、synthesis）
      ├── 配置文件（bridge-profile.json）
      └── stdin/管道模式（供 ACP Agent 集成）
```

Host Bridge 的协议版本为 `host-bridge.v1`。全部端点（`GET /bridge/v1/health` 除外）均需要 Bearer Token 认证。

## 配置

Zotero → 设置 → Zotero Skills → Host Bridge

| 设置项 | 类型 | 默认值 | 说明 |
|-------|------|--------|------|
| **启用 MCP Server** | boolean | `true` | 同时开启 MCP 协议（供第三方 Agent 使用） |
| **禁用写入审批** | boolean | `false` | 危险：绕过所有写入审批。UI 标记为红色危险区域 |
| **启用 LAN 访问** | boolean | `false` | 绑定到 `0.0.0.0` 允许 LAN 访问（强制固定端口） |
| **固定端口** | boolean | `false` | 固定端口号（默认 26570）而非随机分配 |
| **端口号** | number | `26570` | 固定模式下使用的端口（1024-65535） |
| **LAN IP** | string | `""` | 手动覆盖通告给远程主机的 IP；留空自动探测 |
| **启动/显示端点** | 按钮 | — | 确保服务运行并显示当前端点 URL |
| **Rotate Token** | 按钮 | — | 轮换会话 Token |
| **创建/轮换 Master Token** | 按钮 | — | 生成持久化的跨会话 Token |
| **复制 Master Token** | 按钮 | — | 复制 Token 到剪贴板 |
| **复制远程 CLI Profile** | 按钮 | — | 复制完整远程 CLI Profile JSON |
| **安装 CLI** | 按钮 | — | 一键安装 `zotero-bridge` 到系统 PATH |

## 安全模型

### Bearer Token 认证

- 每次请求必须包含 `Authorization: Bearer <token>` 头
- **会话 Token**：插件启动时自动生成（24 字节 base64），生命周期跟随插件会话
- **Master Token**：可选持久化 Token，AES-256-GCM 加密存储，用于跨会话 CLI 访问
- Token 绝不写入 prompt、日志或 Agent 输出

### 写入审批

写入类操作需要 Zotero UI 审批：

| 级别 | 说明 |
|------|------|
| **需审批** | `mutation.execute`、`workflow submit`、`debug.zotero.eval`、`citation_graph.refresh_metrics` |
| **免审批** | 全部只读操作、`diagnostic.get_status`、`mutation.preview` |

**双重自动审批：**
1. Workflow manifest 声明 `allowWriteApprovalBypass: true`
2. 用户在提交对话框中**显式勾选**自动审批

两者同时满足才生效。

### LAN / 远程安全

- LAN 模式绑定 `0.0.0.0`，需手动启用。**仅在受信任网络使用**
- 远程访问需要 Master Token（手动创建），不会被自动分发
- LAN IP 自动探测通过 SkillRunner 后端的网络反射端点完成（可手动覆盖）

## zotero-bridge CLI

`zotero-bridge` 是 Rust 编写的命令行工具，供 ACP Agent 和终端用户直接调用 Host Bridge。

### 安装

通过偏好设置中"安装 CLI"按钮一键安装。ACP 运行使用插件自带的二进制（注入到工作区 PATH）。

### 端点/Token 解析优先级

| 配置源 | 端点 | Token |
|--------|------|-------|
| 命令行 flag | `--endpoint` | — |
| 环境变量 | `ZOTERO_BRIDGE_ENDPOINT` | `ZOTERO_BRIDGE_TOKEN` |
| Profile 文件 | `endpoint` 字段 | `auth.token` / `auth.tokenEnv` |

### 语义化命令

```
zotero-bridge status                           # 健康检查（无需认证）
zotero-bridge manifest                         # 完整能力清单
zotero-bridge call <capability> [--input]      # 原始能力调用
zotero-bridge item search --query <text>
zotero-bridge item get --key <key>
zotero-bridge item notes --key <key>
zotero-bridge item attachments --key <key>
zotero-bridge note get --key <key>
zotero-bridge note payloads --key <key>
zotero-bridge note payload --key <key>
zotero-bridge topics list
zotero-bridge topics get-context --input <JSON>
zotero-bridge topics get-report --input <JSON>
zotero-bridge schemas get
zotero-bridge concepts query --input <JSON>
zotero-bridge citation-graph query-cluster --input <JSON>
zotero-bridge citation-graph get-overview
zotero-bridge library-index get
zotero-bridge resolvers resolve --input <JSON>
zotero-bridge reference-index get
zotero-bridge paper-artifacts get-manifest --input <JSON>
zotero-bridge paper-artifacts read --input <JSON>
zotero-bridge insights get-attention-queue
zotero-bridge literature ingest --input <JSON>
zotero-bridge workflow list
zotero-bridge workflow submit --workflow <id> --input <JSON>
zotero-bridge workflow run <runId>
zotero-bridge file download <fileId> --output <path>
```

输入支持：内联 JSON、JSON 文件路径、`@file` 语法、`-`（stdin）。

### 输出约定

stdout 始终输出恰好一个 JSON 对象：

```json
{ "ok": true, "data": {...}, "meta": { "cli": "zotero-bridge", "schema": "zotero-bridge.cli.v1" } }
{ "ok": false, "error": {...}, "meta": { "cli": "zotero-bridge", "schema": "zotero-bridge.cli.v1" } }
```

错误退出码：

| 类别 | 退出码 |
|------|-------|
| usage | 2 |
| config | 3 |
| connection | 4 |
| auth | 5 |
| permission | 6 |
| validation | 7 |
| capability | 8 |
| workflow | 9 |
| download | 10 |
| protocol | 11 |
| internal | 70 |

### Profile 文件

Well-known profile 位置：

| 系统 | 路径 |
|------|------|
| Windows | `%LOCALAPPDATA%\Zotero-Skills\bridge-profile.json` |
| macOS | `~/Library/Application Support/Zotero-Skills/bridge-profile.json` |
| Linux | `${XDG_DATA_HOME:-~/.local/share}/Zotero-Skills/bridge-profile.json` |

```json
{
  "schema": "zotero-bridge.profile.v1",
  "protocol": "host-bridge.v1",
  "endpoint": "http://127.0.0.1:26570/bridge/v1",
  "connectionMode": "local",
  "auth": { "type": "bearer", "tokenEnv": "ZOTERO_BRIDGE_TOKEN" }
}
```

## ACP Agent 接入方式

当 ACP Agent 运行一个 skill 时，插件自动注入：

```
<workspaceDir>/.zotero-bridge/
  bin/zotero-bridge(.cmd)     # CLI shim
  profile.json                # 连接 Profile（Token 通过环境变量注入）
  README.md                   # 使用提示
```

注入的环境变量：

- `ZOTERO_BRIDGE_PROFILE` — profile.json 路径
- `ZOTERO_BRIDGE_TOKEN` — Bearer Token
- `ZOTERO_BRIDGE_SCOPE` — 审批作用域 JSON
- `PATH` / `Path` — 前置 `.zotero-bridge/bin`

## 可用能力清单

<details>
<summary>全部 30+ capability</summary>

### Context

| Capability | 说明 |
|-----------|------|
| `context.get_current_view` | 当前 Zotero 视图信息 |
| `context.get_selected_items` | 当前选中条目 |

### Library

| Capability | 说明 |
|-----------|------|
| `library.search_items` | 搜索条目 |
| `library.get_item_detail` | 获取条目详情 |
| `library.list_items` | 分页列出条目 |
| `library.get_item_notes` | 获取笔记列表 |
| `library.get_note_detail` | 读取笔记正文 |
| `library.list_note_payloads` | 列出笔记 payload |
| `library.get_note_payload` | 获取指定 payload |
| `library.get_item_attachments` | 获取附件列表 |

### Mutation

| Capability | 说明 |
|-----------|------|
| `mutation.preview` | 预览写入操作（不执行） |
| `mutation.execute` | 执行写入操作（需审批） |

### Synthesis

| Capability | 说明 |
|-----------|------|
| `topics.list` | 列出所有主题 |
| `topics.get_context` | 获取主题上下文 |
| `topics.get_report` | 获取主题报告 |
| `topics.get_review_input` | 组装主题审核包 |
| `schemas.get` | 获取 schema 定义 |
| `concepts.query` | 查询概念知识库 |
| `citation_graph.query_cluster` | 查询引文簇 |
| `citation_graph.get_overview` | 获取图谱概况 |
| `citation_graph.get_slice` | 提取子图 |
| `citation_graph.get_metrics` | 计算图谱指标 |
| `citation_graph.rank_external_references` | 排序外部引用 |
| `citation_graph.rank_library_papers` | 排序库内论文 |
| `paper_artifacts.get_manifest` | 获取产物清单 |
| `paper_artifacts.read` | 读取产物内容 |
| `paper_artifacts.export_filtered` | 导出过滤产物 |
| `paper_artifacts.resolve_topic_digest` | 解析主题摘要 |
| `insights.get_attention_queue` | 获取待关注队列 |
| `resolvers.resolve` | 解析引用/topic 解析器 |
| `reference_index.get` | 获取引用索引 |
| `library_index.get` | 获取库索引 |

### Diagnostic

| Capability | 说明 |
|-----------|------|
| `diagnostic.get_status` | 获取服务状态 |

</details>

## 写入审批流程

```
Agent 调用写入 capability
  │
  ├── 1. 请求到达 Host Bridge（带 Bearer Token）
  ├── 2. Token 校验通过
  ├── 3. 提取 capability 作用域
  ├── 4. 检查审批：
  │     ├── 只读 scope → 直接执行
  │     ├── autoApproveWrites = true 且用户已预批准 → 直接执行
  │     └── 需要审批 → 排队到 Zotero UI
  ├── 5. 在 ACP Chat / SkillRunner 面板显示审批提示
  │     ├── 用户批准 → 执行
  │     └── 用户拒绝 → 返回错误
  └── 6. 返回结果，写入审计日志
```

作用域路由：

| 作用域 | 审批提示路径 |
|--------|------------|
| `acp-skill-run` | ACP Skills UI |
| `acp-chat` | ACP Chat 面板 |
| `skillrunner-run` | SkillRunner 面板 |
| 无 scope 或 `global` | 全局 Zotero 审批 UI |

## LAN / 远程访问

1. 偏好设置中勾选 **启用 LAN 访问**
2. 固定端口或记下当前端口号
3. 创建/复制 **Master Token**
4. 点击 **复制远程 CLI Profile** 获取完整连接配置
5. 在远程机器上配置 endpoint（`http://<LAN_IP>:<port>/bridge/v1`）和 Token
6. 测试：`zotero-bridge status --endpoint http://<LAN_IP>:<port>/bridge/v1`

**重要：** LAN 模式绕过 loopback 保护。仅在受信任的本地网络使用。

## 下一步

- [MCP Server](mcp-server) — 供 MCP 兼容客户端（Claude Desktop 等）使用的标准化协议接口
- [偏好设置](../preferences) — 查看所有 Host Bridge 设置项
- [ACP 后端](acp) — 了解 ACP Agent 的配置方式
