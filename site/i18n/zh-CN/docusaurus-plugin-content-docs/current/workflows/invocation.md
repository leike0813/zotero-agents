# Workflow 调用与配置

## 调用方式

![执行 Workflow 工具栏按钮](/img/icon_play.png)

### 通过右键菜单

1. 在 Zotero 条目列表中选中一个或多个条目
2. 右键点击，选择 **Zotero Agents** 子菜单
3. 从列表中选择一个 workflow
4. 如有配置弹窗，填写参数后点击运行

### 通过 Dashboard

1. 打开 **Dashboard**（工具栏按钮或菜单）
2. 在 Home 页面的 workflow 列表中找到目标 workflow
3. 点击 **运行** 按钮
4. 如有配置弹窗，填写参数后提交

## Workflow Settings 对话框

运行 workflow 前可能会弹出设置对话框，包含以下配置项：

### 参数设置

显示 workflow 声明的所有可配置参数，根据 workflow 的定义不同而不同。

### Provider 选项

| 选项 | 说明 |
|------|------|
| 后端选择 | 选择执行该 workflow 的后端实例 |
| 模型选择 | 使用的 AI 模型（由后端提供） |
| 模式设置 | 运行模式配置 |
| Reasoning Effort | 推理努力程度（如果后端支持） |

### 执行模式

| 模式 | 说明 |
|------|------|
| `auto` | 自动执行，无需用户干预 |
| `sync` | 同步执行，等待结果 |
| `async` | 异步执行，后台运行 |

### SkillRunner 模式

对于 Skill-Runner 后端：

| 模式 | 说明 |
|------|------|
| `auto` | 非交互式执行，适合不需要用户输入的 skill |
| `interactive` | 交互式执行，在执行过程中可能需要用户输入 |

## 执行与监控

- 工作提交后，可以在 Dashboard 中查看执行进度
- 实时状态更新（queued → running → succeeded/failed/canceled）
- 对于交互式 workflow，可以在侧边栏中回复等待输入的任务
- 执行完成后，结果会通过 hook 脚本应用到 Zotero

## 注意事项

- 首次运行 workflow 可能需要配置后端
- 部分 workflow 可能有特定的输入要求（如必须选中附件）
- 交互式 workflow 需要保持 Zotero 运行以处理用户输入
