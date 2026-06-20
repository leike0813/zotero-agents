# Dashboard

## 概述

Dashboard 是 Zotero Skills 的中央监控和控制面板。您可以在这里查看任务状态、管理工作流、浏览历史记录和检查运行日志。

## 打开方式

- **工具栏按钮**：点击 Zotero 工具栏中的 Zotero Skills 图标
- **菜单**：**工具 → 打开 Dashboard**
- **Zotero Tab**：通过菜单打开，显示为独立的 Zotero 标签页

## 页面说明

### Home（首页）

Dashboard 的默认页面，展示：

- **Workflow 列表**：所有可用的 workflow，配有运行和设置按钮
- **ACP Chat 区域**：快速访问 ACP 对话
- **ACP Skill Runs**：ACP 后端的技能运行状态
- **Skill Feedback**：查看近期的 Skill 运行反馈评分和备注
- **任务摘要**：当前正在运行的任务概览

### Workflow Options

Workflow 参数设置页面：

- 查看和修改每个 workflow 的配置
- 设置默认参数
- 选择默认后端

### Backends（后端）

后端管理页面：

- 所有已配置的后端列表
- 每个后端的任务历史
- 后端详情视图（按类型区分）

后端详情视图：

| 后端类型 | 显示内容 |
|---------|---------|
| Generic HTTP | 任务表格 + 运行日志 |
| SkillRunner | 运行表格 + 状态区 + 对话区 + 回复/取消操作 |
| ACP | Skill Run 视图 |

### Products（产物）

Workflow 产物的浏览和管理：

- 查看 workflow 运行的输出产物
- 打开产物文件夹
- 预览和移除产物

## Skill Feedback

Skill Feedback 面板显示近期的技能运行反馈：

| 列 | 说明 |
|---|---|
| Workflow | 运行的 workflow 名称 |
| Backend | 执行的后端 |
| Rating | 用户评分 (1-5) |
| Comment | 反馈备注 |
| Timestamp | 反馈时间 |

操作：
- **筛选**：按 rating、workflow、时间范围筛选
- **导出**：导出 feedback 数据用于分析

## 任务状态

| 状态 | 说明 |
|------|------|
| `queued` | 等待执行 |
| `running` | 正在执行 |
| `waiting_user` | 等待用户输入 |
| `waiting_auth` | 等待授权 |
| `succeeded` | 执行成功 |
| `failed` | 执行失败 |
| `canceled` | 已取消 |

## Runtime Logs 查看器

Dashboard 提供内建的日志查看器：

- 按后端过滤
- 按 workflow 过滤
- 按日志级别过滤
- 按时间范围过滤
- 诊断导出功能
- 问题概要复制

## 工具栏按钮

Zotero 工具栏中的 Zotero Skills 图标按钮支持：

- 左键点击：打开/切换 Dashboard
- 显示运行中的任务数量
- 弹出运行任务列表
