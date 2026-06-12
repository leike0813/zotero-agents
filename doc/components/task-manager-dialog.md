# Task Manager Dialog / Dashboard Host

## Overview

`src/modules/taskManagerDialog.ts` 是 Task Dashboard 的 host 端运行时。它负责 ztoolkit.Dialog 生命周期管理、Web 面板嵌入、host↔web 双向通信桥接，以及跨后端的任务聚合展示。

### 命名说明

文件名和 `openTaskManager` 事件名是历史遗留。当前 UI 实际标题为 "Task Dashboard"。模块内部仍然使用这些名称以保证向后兼容。

### 双层架构

```
Zotero Plugin Process (Host)                Web Panel (Child)
┌─────────────────────────────────┐         ┌────────────────────┐
│ taskManagerDialog.ts            │ bridge  │ dashboard/*.html   │
│  · ztoolkit.Dialog(1, 1)       │◄───────►│  · Home / Backends  │
│  · host data collector         │ message │  · Task tables      │
│  · window lifecycle            │         │  · Log viewer       │
│  · backend-type routing        │         │  · Skill run chat   │
└─────────────────────────────────┘         └────────────────────┘
```

- **嵌入模式**：`mountTaskDashboardRuntime()` 支持嵌入到 workspace sidebar 等非 Dialog 容器
- **整页模式**：`openTaskManagerDialog()` 创建独立 Dialog 窗口

配套文档：
- `doc/components/ui-shell.md` — UI 入口分发
- `doc/components/dashboard-modules.md` — Dashboard 子模块（Active Tasks、Toolbar Button、Task History、Task Snapshot）

## 入口与调用方

| 入口事件 | 调用方 | 初始 Tab | 用途 |
|---------|--------|---------|------|
| `openTaskManager` | `src/hooks.ts:592` | home（默认） | 直接打开 Dashboard |
| `openWorkflowSettings` | `src/hooks.ts:585` | `workflow-options` | 从设置入口打开 |
| `openLogViewer` | `src/hooks.ts:684` | `runtime-logs` | 从日志入口打开 |
| `mountTaskDashboardRuntime()` | `workspaceTab.ts` | 按参数指定 | 嵌入到 workspace sidebar |
| `resetTaskManagerDialogRuntimeForTests()` | `testRuntimeCleanup.ts` | — | 测试清理 |

## Dialog 生命周期

### 打开流程

```
openTaskManagerDialog(args?)
  → 检查 isWindowAlive(taskManagerDialog?.window)  // 防重复打开
  → loadBackendsRegistry()
  → new ztoolkit.Dialog(1, 1)
  → addCell(0, 0, div#zs-task-manager-root)  // Web 面板挂载点
  → addButton("Close")
  → setDialogData({ _allowBackendManagerClose, ... })
  → open(title)
  → loadCallback:
      → 注册 dashboard context menu（acp-skill-run 相关）
      → mountDashboardRuntime(root, dialogWindow, { exposeExternalSelectTab })
  → await unloadLock?.promise
  → taskManagerDialog = undefined
```

### 关闭流程

- 点击 Close 按钮 → `_allowBackendManagerClose = true` → 关闭 Dialog
- Dialog 关闭 → `unloadCallback` → `cleanupDashboardRuntime()`
- `await unloadLock.promise` 继续 → `taskManagerDialog = undefined`

### 窗口存活管理

- `isWindowAlive(taskManagerDialog?.window)` 在每次入口处检查
- `taskManagerDialog?.window?.focus()` 复用已有窗口

## Host↔Web 桥接

### 消息协议

| 消息类型 | 方向 | 用途 |
|---------|------|------|
| `dashboard:init` | H→C | 首次完整 snapshot |
| `dashboard:snapshot` | H→C | 后续刷新 |
| `dashboard:action` | C→H | 用户操作请求 |

### 数据流

Web panel 发起 action → Host 从以下数据源收集信息 → 构造 snapshot 发回：

- `loadBackendsRegistry()` — 后端配置
- `listActiveWorkflowTasks()` — 活跃任务
- `listTaskDashboardHistory()` — 任务历史
- `listRuntimeLogs()` — 运行时日志

### 外部 Tab 选择

`exposeExternalSelectTab` 机制允许外部代码触发 Dashboard 内的 tab 切换。通过 `externalSelectTab` 导出变量设置回调。

## 数据提供

### Backend 详情视图（按类型区分）

| Backend 类型 | 展示内容 |
|-------------|---------|
| `generic-http` | 任务表格 + runtime logs 过滤视图（requestId / jobId / workflowId） |
| `skillrunner` | Run 表格 + 状态区 + 对话区 + reply / cancel 操作 |
| `pass-through` | 不展示、不计数、不写入历史 |
| `acp` | Skill run 状态视图 |

### 页面信息架构

- **Dashboard Home**：总任务统计 + 当前运行任务表格
- **backend:\<id\>**：每个 backend 独立页面（表格列表 + 操作区）
- **Workflow Options**：Workflow 设置页面
- **Runtime Logs**：日志查看页面

### 可见性策略

- Backend 页面数据源为 running + history 合并视图
- SkillRunner 在 `/v1/jobs` create 成功后即写入 `requestId`，running 阶段可直接 "open run"
- ACP Skill Run 在 request-created 时注册上下文，支持对话和重新申请

## 内部类型

```typescript
type DashboardState = {
  backends: BackendInstance[];
  activeTasks: WorkflowTaskRecord[];
  history: TaskDashboardHistoryRecord[];
  logs: RuntimeLogRecord[];
};

type DashboardManagementHost = {
  selectTab?(tab: string): void;
  onAction?(action: string, payload?: unknown): void;
};

type MountedTaskDashboardRuntime = {
  refresh: () => Promise<void>;
  cleanup: () => void;
};
```

## 本地化

使用 `getString()` 获取 i18n 文本。关键键值：

| Key | 默认值 | 用途 |
|-----|--------|------|
| `task-manager-title` | "Task Dashboard" | 对话框标题 |
| `task-manager-close` | "Close" | 关闭按钮 |
| `task-manager-column-task` | "Task" | 表格列 |
| `task-manager-column-workflow` | "Workflow" | 表格列 |
| `task-manager-column-status` | "Status" | 表格列 |
| `task-manager-status-queued` | "Queued" | 状态标签 |
| `task-manager-status-running` | "Running" | 状态标签 |

## 测试

`resetTaskManagerDialogRuntimeForTests()` 清除 `externalSelectTab` 引用，关闭存活窗口并置空全局 `taskManagerDialog`。

`src/modules/testRuntimeCleanup.ts` 在测试套件启动时调用清理，确保 Dialog 状态不被跨测试污染。
