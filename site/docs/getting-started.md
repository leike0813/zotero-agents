# 快速开始

## 1. 安装官方 Workflow 包

插件本身不含业务逻辑。安装插件后，首先需要安装官方 Workflow 包：

1. 在任意 Zotero 条目上右键 → **Zotero Agents** → **📦 安装官方 Workflow 包**
2. 等待下载和安装完成
3. 安装成功后可在 Dashboard 中看到所有官方 Workflow

也可以随时在 **Zotero → 设置 → Zotero Agents** 中安装或更新官方包。

## 2. 配置后端

安装插件和官方包后，您需要配置至少一个后端连接。

### 推荐：配置 ACP 后端（零配置）

这是最推荐的方案——只要本机安装了任意一款支持 ACP 的 Agent 工具即可。

1. 打开 **工具 → [后端管理器](backends/backend-manager)**
2. 切换到 **ACP** Tab
3. 从 **Add from Preset** 下拉菜单选择你的 Agent 工具（Codex / OpenCode / Claude Code 等）
4. 预置自动填充命令，**无需额外配置**，点击右下角 **保存**

→ 详见 [ACP 后端配置](backends/acp)

### 备选：Docker 部署 Skill-Runner

如果需要后台持续执行或局域网共享：

1. 在机器上 [Docker 部署 Skill-Runner](backends/skill-runner#推荐docker-常驻部署)
2. 在后端管理器中切换到 **SkillRunner** Tab，添加后端实例并填写 Base URL

→ 详见 [Skill-Runner 部署与配置](backends/skill-runner)

> 对于 ACP 兼容后端，选择 **ACP** Tab，可使用 **Add from Preset** 下拉菜单快速选择内建预置。

> 详细的对话操作指南参见 [后端管理器](backends/backend-manager)。

## 3. 验证连接

1. 从 Zotero 工具栏或 **工具 → 任务面板** 打开任务面板
2. 您配置的后端应出现在面板侧边栏中
3. 如果后端正在运行，其状态指示器应显示为已连接

## 4. 运行第一个技能

1. 在任务面板中，从 **技能** 区域选择一个技能
2. 配置所需的参数
3. 点击 **运行** 来执行技能
4. 在面板中监控进度——您将看到技能执行期间的实时更新
5. 完成后，查看结果和输出

## 5. 探索工作流

工作流将多个技能链接到自动化的流水线中。

1. 打开 **工具 → 工作流设置**
2. 浏览可用的工作流或创建新的工作流
3. 配置工作流步骤和触发条件
4. 运行工作流并在面板中监控其进度

## 下一步

- **探索预置技能**：在面板中浏览可用的技能
- **创建自定义工作流**：将技能组合成自动化的流水线
- **监控性能**：使用运行日志和面板中的检查工具
- **加入社区**：在 [GitHub 仓库](https://github.com/leike0813/zotero-agents) 或 [Gitee 镜像](https://gitee.com/leike0813/zotero-agents) 中报告问题或建议功能
