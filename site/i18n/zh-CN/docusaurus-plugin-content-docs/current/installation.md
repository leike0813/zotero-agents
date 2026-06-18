# 安装指南

## 系统要求

- **Zotero**：7.0 或更高版本
- **平台**：Windows 10+、macOS 12+、Linux（x86_64 / x86 / ARM64 / ARM）

## 安装插件

### 从 GitHub Release 安装（推荐）

1. 访问 [Releases 页面](https://github.com/leike0813/Zotero-Skills/releases)
2. 下载最新的 `.xpi` 文件
3. 在 Zotero 中，打开 **工具 → 附加组件**
4. 点击齿轮图标，选择 **从文件安装附加组件...**
5. 选择下载的 `.xpi` 文件

### 从源码构建

```bash
git clone https://github.com/leike0813/Zotero-Skills.git
cd Zotero-Skills
npm install
npm run build
```

构建产物位于 `.scaffold/build/` 目录。

## 安装 Skill-Runner 后端

技能由 Skill-Runner 后端执行。您可以使用：

- **本地 Skill-Runner** — 在您自己的机器上运行，需要 Python 3.10+
- **远程 Skill-Runner** — 连接到共享或云托管的实例

### 快速安装（本地）

请参考 [Skill-Runner 仓库](https://github.com/leike0813/skill-runner) 中的说明来搭建本地后端。

## 验证安装

安装完成后：

1. 重启 Zotero
2. 您应该能在 Zotero 工具栏中看到新的 **Zotero Skills** 区域
3. 打开 **工具 → [后端管理器](backends/backend-manager)** 来配置后端连接
4. 在对话框中切换 Tab 查看可用的 provider 类型（ACP / SkillRunner / Generic HTTP）
