# 安装指南

## 系统要求

- **Zotero**：7.0 或更高版本（推荐 Zotero 9）
- **平台**：Windows 10+、macOS 12+、Linux（x86_64 / x86 / ARM64 / ARM）

> **关于 Zotero 版本**：本插件在 Zotero 9 上开发与测试。Zotero 8 理论上可完整支持（Zotero 8/9 的插件框架没有明显改变）；Zotero 7 理论上也能支持，但受精力所限未进行深入测试，未来的维护重点将放在 Zotero 9 上。如果在 Zotero 7 使用过程中遇到问题，请在 [Issues](https://github.com/leike0813/zotero-agents/issues) 反馈。

## 安装插件

### 从 GitHub/Gitee Release 安装（推荐）

1. 访问 [GitHub Releases](https://github.com/leike0813/zotero-agents/releases) 或 [Gitee Releases 镜像](https://gitee.com/leike0813/zotero-agents/releases)
2. 下载最新的 `.xpi` 文件
3. 在 Zotero 中，打开 **工具 → 附加组件**
4. 点击齿轮图标，选择 **从文件安装附加组件...**
5. 选择下载的 `.xpi` 文件

### 通过 Zotero 插件市场安装

如果您已安装 [Zotero 插件市场](https://github.com/syt2/zotero-addons) 插件，可以直接在市场中搜索并安装 Zotero Agents：

1. 点击 Zotero 工具栏中的 <img src="/img/zotero-addons_icon.png" alt="Zotero 插件市场" style="width:20px;vertical-align:middle"/> 图标打开插件市场
2. 搜索 **Zotero Agents**
3. 点击安装即可

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

官方 Workflow 包仓库：[GitHub](https://github.com/leike0813/zotero-agents-workflows) · [Gitee 镜像](https://gitee.com/leike0813/zotero-agents-workflows)

## 验证安装

1. 重启 Zotero
2. 在 Zotero 工具栏中应该能看到 **Zotero Agents** 图标
3. 右键任意条目，菜单中应出现 **Zotero Agents** 子菜单（内含可用的 Workflow）

如果右键菜单中只有一个 **📦 安装官方 Workflow 包** 选项，说明官方包尚未安装——按照上方的指引安装即可。安装成功后，前往 [快速开始](#doc/getting-started) 配置后端并运行你的第一个 Workflow。
