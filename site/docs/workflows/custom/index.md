# 自定义 Workflow 架构总览

Zotero Skills 的 workflow 系统采用**插拔式架构**——每个 workflow 是一个独立的自包含目录，只需一个 `workflow.json` 清单文件和对应的 Hook 脚本，插件的 Workflow Manager 会自动发现并加载它。

## 目录结构

Workflow 可以存放在两个位置：

| 位置 | 类型 | 说明 |
|------|------|------|
| `workflows_builtin/` | 内建 | 随插件发布，不可修改 |
| 用户 workflow 目录 | 自定义 | 在偏好设置中配置，Workflow Manager 会自动扫描 |

插件的 **Workflow Manager** 会递归扫描所有 workflow 目录，发现 `workflow.json` 文件并注册为可用 workflow。

## 一个最小 Workflow 示例

创建一个自定义 workflow，只需要 **2 个文件**：

```
my-workflow/
├── workflow.json
└── hooks/
    └── applyResult.mjs
```

### workflow.json

```json
{
  "id": "hello-world",
  "label": "Hello World",
  "provider": "pass-through",
  "inputs": {
    "unit": "parent"
  },
  "hooks": {
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

### hooks/applyResult.mjs

```js
export function applyResult({ parent, runtime }) {
  const title = runtime.helpers.resolveItemRef(parent).getField("title");
  runtime.hostApi.notifications.toast({
    text: `Hello, ${title}!`,
    type: "success",
  });
  return { greeted: true };
}
```

将 `my-workflow/` 放到用户 workflow 目录后，重新打开 Dashboard 即可看到该 workflow。

## Workflow 的架构层次

一个 workflow 的生命周期涉及以下层次：

```
用户操作（右键 / Dashboard）
    │
    ▼
Workflow Manager — 发现、加载、校验
    │
    ├── Inputs — 用户选择了什么条目？
    ├── Parameters — 用户设置了什么参数？
    ├── Hooks — 预处理、构建请求、处理结果
    └── Execution — 由 Provider 派发到后端
         │
         ▼
      Provider（SkillRunner / ACP / Generic HTTP / Pass-through）
         │
         ▼
      Backend — 远程或本地的执行引擎
```

## Workflow 的模式分类

根据执行方式和后端类型，workflow 可以分为以下几类：

| 模式 | 典型用途 | 后端类型 |
|------|---------|---------|
| **pass-through** | 纯本地操作（导出、文件处理），无需远程后端 | 无 |
| **skillrunner.job.v1** | 单步骤向 SkillRunner 提交 skill 执行 | skillrunner / acp |
| **skillrunner.sequence.v1** | 多步骤串联技能执行，步间接力 | acp |
| **generic-http.request.v1** | 单个 HTTP API 调用 | generic-http |
| **generic-http.steps.v1** | 多步骤 HTTP API 调用 | generic-http |

## workflow.json 的核心概念

```json
{
  "id": "唯一标识符",
  "label": "显示名称",
  "provider": "后端类型",
  "inputs": { "unit": "输入单元类型" },
  "parameters": { /* 可配置参数 */ },
  "execution": { /* 执行控制 */ },
  "request": { "kind": "请求种类" },
  "hooks": { "applyResult": "处理结果的脚本路径" }
}
```

下页将详细说明每个字段的含义和用法。

## 下一步

- [编写 Workflow 清单文件](manifest) — workflow.json 各字段详解
- [Hook 系统](hooks) — 各阶段钩子的编写方法
- [参数系统](parameters) — 定义可配置参数
