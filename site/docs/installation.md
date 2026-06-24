# 安装指南

## 系统要求

- **Zotero**：7.0 或更高版本
- **平台**：Windows 10+、macOS 12+、Linux（x86_64 / x86 / ARM64 / ARM）

## 安装插件

### 从 GitHub/Gitee Release 安装（推荐）

1. 访问 [GitHub Releases](https://github.com/leike0813/zotero-agents/releases) 或 [Gitee Releases 镜像](https://gitee.com/leike0813/zotero-agents/releases)
2. 下载最新的 `.xpi` 文件
3. 在 Zotero 中，打开 **工具 → 附加组件**
4. 点击齿轮图标，选择 **从文件安装附加组件...**
5. 选择下载的 `.xpi` 文件

### 从源码构建

```bash
git clone https://github.com/leike0813/zotero-agents.git
cd zotero-agents
npm install
npm run build
```

构建产物位于 `.scaffold/build/` 目录。

## 安装官方 Workflow 包

插件安装后**不含任何业务逻辑**，所有 Workflow 均通过独立的官方 Workflow 包提供。

### 方法一：菜单安装（推荐）

1. 重启 Zotero 后，在任意条目上右键 → **Zotero Agents** → **📦 安装官方 Workflow 包**
2. 插件自动从 GitHub / Gitee 下载最新的官方包
3. 安装完成后弹出成功提示，Dashboard 中即可看到所有官方 Workflow

### 方法二：偏好设置中安装

1. 打开 **Zotero → 设置 → Zotero Agents**
2. 在 **Workflow 设置** 区域点击 **安装官方 Workflow 包**
3. 也可以在此处切换更新频道（stable / beta / dev）后检查更新

### 更新机制

- 插件启动时自动检测官方包是否有新版本
- 有新版本时弹出更新确认对话框
- 更新后自动重新加载 Workflow 列表

### 官方 Workflow 包仓库

- GitHub：[leike0813/zotero-agents-workflows](https://github.com/leike0813/zotero-agents-workflows)
- Gitee 镜像：[leike0813/zotero-agents-workflows](https://gitee.com/leike0813/zotero-agents-workflows)

## 安装 Skill-Runner 后端

技能由 Skill-Runner 后端执行。您可以使用：

- **本地 Skill-Runner** — 在您自己的机器上运行，需要 Python 3.10+
- **远程 Skill-Runner** — 连接到共享或云托管的实例

### 快速安装（本地）

请参考 [Skill-Runner 仓库](https://github.com/leike0813/skill-runner) 中的说明来搭建本地后端。

## 验证安装

安装完成后：

1. 重启 Zotero
2. 您应该能在 Zotero 工具栏中看到新的 **Zotero Agents** 区域
3. 打开 **工具 → [后端管理器](backends/backend-manager)** 来配置后端连接
4. 在对话框中切换 Tab 查看可用的 provider 类型（ACP / SkillRunner / Generic HTTP）
