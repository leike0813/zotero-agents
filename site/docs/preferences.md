# 偏好设置

Zotero Skills 的设置位于 **Zotero → 设置 → Zotero Skills**（Windows/Linux）或 **Zotero → 偏好设置 → Zotero Skills**（macOS）。

## Workflow 设置

### Workflow 目录

- **路径**：自定义 Workflow 的存放目录
- **默认位置**：`<Zotero Data>/zotero-agents/data/workflows`
- **扫描 Workflow**：点击按钮重新扫描目录，加载所有 Workflow

### 内建 Workflow 目录

内建 Workflow 存放在 `<Zotero Data>/zotero-agents/data/workflows_builtin`，不可自定义。

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

## Synthesis Git Sync

Synthesis Workbench 的可选 Git 同步功能：

| 设置项 | 说明 |
|-------|------|
| 启用 Git 同步 | 开启/关闭 Canonical Store 的 Git 同步 |
| 远程仓库 URL | Git 远程仓库地址 |
| 分支名 | 同步使用的 Git 分支 |

## 其他通用选项

- **默认后端**：选择默认使用的后端实例
- **自动启动本地后端**：Zotero 启动时自动启动 Skill-Runner
- **日志级别**：设置日志记录级别

## 设置管理路径

```
Zotero → 设置 → Zotero Skills
├── Workflow 设置
├── SkillRunner Local Backend
├── Synthesis Git Sync
└── 通用选项
```
