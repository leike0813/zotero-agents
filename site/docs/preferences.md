# 偏好设置

Zotero Skills 的设置位于 **Zotero → 设置 → Zotero Skills**（Windows/Linux）或 **Zotero → 偏好设置 → Zotero Skills**（macOS）。

## Workflow 设置

### Workflow 目录

- **路径**：自定义 Workflow 的存放目录
- **默认位置**：`<Zotero Data>/zotero-agents/data/workflows`
- **扫描 Workflow**：点击按钮重新扫描目录，加载所有 Workflow

### Skill 目录

- **路径**：自定义 Skill 包存放目录
- **扫描**：点击按钮扫描目录加载 Skills

### 内建 Workflow 目录

内建 Workflow 存放在 `<Zotero Data>/zotero-agents/data/workflows_builtin`。

### 运行时设置

- **启用 Skill Run Feedback**：开启后 Skill 运行可写入 Markdown 反馈 sidecar，由 Dashboard Skill Feedback 面板采集

## Host Bridge

内嵌 HTTP 服务，供外部 AI 工具和 CLI 访问 Zotero 库。详见 [Host Bridge](backends/host-bridge)。

| 设置项 | 类型 | 说明 |
|-------|------|------|
| **启用 MCP Server** | boolean | 同时开放 MCP 协议接口 |
| **禁用写入审批** | boolean | 危险操作：绕过所有写入审批 |
| **启用 LAN 访问** | boolean | 开放局域网访问 |
| **固定端口** | boolean | 使用固定端口而非随机 |
| **端口号** | number | 固定端口值（默认 26570） |
| **LAN IP** | string | 手动指定通告 IP（留空自动探测） |

操作按钮：

- **启动/显示端点**：启动服务并显示端点 URL
- **Rotate Token**：轮换会话 Token
- **创建/轮换 Master Token**：生成持久化 Token
- **复制 Master Token**：复制到剪贴板
- **复制远程 CLI Profile**：获取远程连接配置
- **安装 CLI**：一键安装 `zotero-bridge`

## SkillRunner Local Backend

本地 Skill-Runner 的运行管理区域：

| 功能 | 说明 |
|------|------|
| **一键部署** | 下载并安装最新版本的 Skill-Runner 运行时 |
| **启动** | 启动本地 Skill-Runner 进程 |
| **停止** | 停止正在运行的本地 Skill-Runner |
| **卸载** | 移除已安装的运行时文件 |
| **打开管理 UI** | 在插件中打开后端的管理界面 |
| **打开技能文件夹** | 打开技能文件的存放目录 |
| **刷新模型缓存** | 更新后端的模型列表缓存 |
| **打开调试控制台** | 查看后端日志输出 |

## Backend Manager

管理所有后端 Profile：

- 按 Provider 分组显示（SkillRunner、ACP、Generic HTTP）
- 添加/编辑/删除后端
- 每个后端可配置：ID、Base URL、Bearer Token、超时

## WebDAV Sync

Synthesis Workbench 的跨设备同步方案，替代已弃用的 Git Sync。详见 [WebDAV 同步](synthesis/webdav-sync)。

| 设置项 | 类型 | 默认值 | 说明 |
|-------|------|--------|------|
| **启用 WebDAV 同步** | boolean | `false` | 主开关 |
| **Base URL** | string | `""` | WebDAV 服务器地址 |
| **远程路径** | string | `"zotero-agents"` | 远程目录路径 |
| **用户名** | string | `""` | WebDAV 用户名 |
| **密码/令牌** | encrypted | `""` | 密码或应用令牌（AES-256-GCM 加密） |
| **自动同步** | boolean | `false` | 每次变更后自动触发同步 |
| **自动重试** | boolean | `false` | 失败时自动重试 |

操作按钮：Save Settings、Save Credential、Test Connection。

## Runtime Data

展示持久化根目录、运行时用量和完整性诊断：

- **持久化根目录**：`<Zotero Data>/zotero-agents/data/`
- **Synthesis Canonical Store**：本地 SQLite + 持久化包
- **各目录大小**：data/、cache/、logs/、tmp/ 等
- **诊断面板**：检测文件系统问题（如 WAL 文件未清理）

注意：Synthesis Canonical Store 和状态数据库仅诊断，不在此处清理。

## 其他通用选项

- **默认后端**：选择默认使用的后端实例
- **自动启动本地后端**：Zotero 启动时自动启动 Skill-Runner
- **日志级别**：设置日志记录级别

## 设置管理路径

```
Zotero → 设置 → Zotero Skills
├── Workflow 设置
│   ├── Workflow 目录
│   ├── Skill 目录
│   └── 运行时设置
├── Host Bridge
│   ├── 服务启停
│   ├── 网络与端口
│   └── Token 管理
├── SkillRunner Local Backend
├── Backend Manager
├── WebDAV Sync
├── Runtime Data
└── 通用选项
```
