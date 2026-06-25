# 后端管理器

后端管理器是管理所有后端配置的统一对话页面。通过管理员可以添加、编辑、删除和验证后端连接。

## 打开方式

- **菜单**：**工具 → 后端管理器**

## 界面布局

```
┌─────────────────────────────────────────────────┐
│  后端管理器                          [取消] [保存] │
├─────────────────────────────────────────────────┤
│  [ACP] [SkillRunner] [Generic HTTP]              │
├─────────────────────────────────────────────────┤
│  ACP                                   [添加 ACP] │
│                                                 │
│  ┌─ 显示名称: [________]  ─┐                    │
│  │  命令:     [________]    │                    │
│  │  参数:     参数编辑器     │                    │
│  │  环境变量:  环境变量编辑器 │  [移除]           │
│  └──────────────────────────┘                    │
│                                                 │
│  ┌─ 显示名称: [________]  ─┐                    │
│  │  ...                     │  [移除]           │
│  └──────────────────────────┘                    │
└─────────────────────────────────────────────────┘
```

## 总体操作

### Tab 切换

对话顶部有三个 Tab：**ACP**、**SkillRunner**、**Generic HTTP**。点击 Tab 切换到对应类型的后端配置区。每个 Tab 下列出该类型的所有已配置后端。

### 添加后端

点击某个 Tab 下的 **添加** 按钮，在该类型下新增一个空白配置行。填写字段后点击右下角的 **保存** 生效。

### 编辑后端

直接在配置行中修改字段。未保存的修改不会生效。

### 删除后端

点击配置行内的 **移除** 按钮删除该后端。删除操作在保存后生效。

### 保存与取消

| 按钮 | 位置 | 作用 |
|------|------|------|
| **保存** | 对话框右下角 | 保存所有变更并关闭对话框 |
| **取消** | 对话框右下角（保存旁） | 放弃所有未保存的变更并关闭对话框 |

关闭对话框前如果有未保存的变更，会提示确认。

---

## ACP Tab

ACP 后端是本地运行的 Agent 子进程。配置中指定启动命令，插件负责管理进程的生命周期。

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/backends/backend-manager_ACP.webp" alt="ACP 后端配置页面" title="ACP 后端配置页面" loading="lazy" /><figcaption>ACP 后端配置页面</figcaption></figure>

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| **显示名称** | 是 | 后端的显示名称，用于在 Dashboard 和侧边栏中标识此后端 |
| **命令** | 是 | 启动 ACP 后端的命令（如 `npx opencode-ai@latest acp`） |
| **参数** | 否 | 命令的附加参数，通过参数编辑器逐条添加 |
| **环境变量** | 否 | 额外的环境变量，通过环境变量编辑器逐条添加（键值对） |

### ACP 预置（Preset）

ACP Tab 上方有一个 **Add from Preset** 下拉菜单。选择一个预置后，插件自动填充命令和常用参数。

内建预置：

| 预置 | 命令 |
|------|------|
| **OpenCode** | `npx opencode-ai@latest acp` |
| **Codex** | `npx codex acp` |
| **Claude Code** | `npx @anthropic-ai/claude-code acp` |
| **Gemini CLI** | `npx @google/gemini-cli acp` |
| **Qwen Code** | `qwen-code acp` |

选择预置后仍可手动修改任何字段。

### 操作按钮

| 按钮 | 作用 |
|------|------|
| **刷新运行时选项** | 重新探测此后端的模型列表、模式列表等运行时能力 |

### 参数编辑器

**添加参数**：点击添加按钮，输入参数内容。
**移除参数**：点击参数旁的移除按钮。

### 环境变量编辑器

**添加环境变量**：点击添加按钮，填写键（Key）和值（Value）。
**移除环境变量**：点击变量旁的移除按钮。

---

## SkillRunner Tab

SkillRunner 后端通过 HTTP API 与 Skill-Runner 服务通信，支持本地和远程两种部署模式。

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/backends/backend-manager_skillrunner.webp" alt="SkillRunner 后端配置页面" title="SkillRunner 后端配置页面" loading="lazy" /><figcaption>SkillRunner 后端配置页面</figcaption></figure>

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| **显示名称** | 是 | 后端的显示名称 |
| **Base URL** | 是 | Skill-Runner 服务的地址（如 `http://127.0.0.1:29813`） |
| **认证方式** | 否 | 选择 `none`（无认证）或 `bearer`（Bearer Token 认证） |
| **认证令牌** | 否 | Bearer Token（仅当认证方式为 bearer 时填写） |
| **超时时间** | 否 | 请求超时时间（毫秒） |

### 操作按钮

| 按钮 | 作用 |
|------|------|
| **打开管理 UI** | 打开 Skill-Runner 内置的 Web 管理界面 |
| **刷新模型缓存** | 刷新此后端的模型列表缓存 |

---

## Generic HTTP Tab

Generic HTTP 后端用于向任意 HTTP 服务发送请求，主要用于调用外部 API（如 MinerU 文档解析服务）。

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/backends/backend-manager_generic-HTTP.webp" alt="Generic HTTP 后端配置页面" title="Generic HTTP 后端配置页面" loading="lazy" /><figcaption>Generic HTTP 后端配置页面</figcaption></figure>

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| **显示名称** | 是 | 后端的显示名称 |
| **Base URL** | 是 | HTTP 服务的基础地址 |
| **认证方式** | 否 | 选择 `none` 或 `bearer` |
| **认证令牌** | 否 | Bearer Token（仅当认证方式为 bearer 时填写） |
| **超时时间** | 否 | 请求超时时间（毫秒） |

## 后端能力探测

保存后端后，插件会在后台自动探测后端能力：

- **ACP**：检测命令可用性、连接初始化、模型列表、模式列表，计算配置指纹以检测后续改动
- **SkillRunner**：检测 API 可用性、引擎列表、模型列表
- **Generic HTTP**：检测 HTTP 端点可达性

探测结果在 Dashboard 和侧边栏中以后端状态指示显示。

## 下一步

配置完成后，您可以：

- 在 [ACP Chat](#doc/sidebar%2Facp-chat) 或 [ACP Skills](#doc/sidebar%2Facp-skills) 中使用 ACP 后端
- 通过 [SkillRunner Tab](#doc/sidebar%2Fskillrunner-tab) 管理 SkillRunner 运行
- 在 [Workflow 列表](#doc/workflows%2Findex) 和 [Dashboard](#doc/dashboard) 中使用配置好的后端执行任务
