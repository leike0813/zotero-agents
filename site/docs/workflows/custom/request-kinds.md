# 请求种类

Workflow 通过声明 `request.kind` 来决定请求由哪个 Provider（执行器）处理。系统内置了多种请求种类，对应不同的后端和执行模式。

## 请求种类总览

| `kind` | 适用 provider | 说明 |
|--------|-------------|------|
| `pass-through.run.v1` | pass-through | 纯本地执行，不涉及远程后端 |
| `skillrunner.job.v1` | skillrunner / acp | 单步骤 SkillRunner 技能执行 |
| `skillrunner.sequence.v1` | acp | 多步骤技能串联执行 |
| `acp.prompt.v1` | acp | 直接向 ACP 后端发送提示 |
| `acp.skill.run.v1` | acp | 直接向 ACP 后端提交技能运行 |
| `generic-http.request.v1` | generic-http | 单步骤 HTTP API 调用 |
| `generic-http.steps.v1` | generic-http | 多步骤 HTTP API 调用 |

## pass-through.run.v1 — 纯本地执行

不需要远程后端，直接在插件内执行。适用于文件操作、数据导出等纯本地场景。

```json
{
  "provider": "pass-through",
  "request": {
    "kind": "pass-through.run.v1"
  }
}
```

在 `buildRequest` hook 中构造请求时，通常传递 `selectionContext` 和 `parameter`：

```js
export function buildRequest({ selectionContext, executionOptions }) {
  return {
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: executionOptions?.workflowParams || {},
  };
}
```

## skillrunner.job.v1 — 单步骤技能执行

向 Skill-Runner 后端提交单个 skill 执行请求。提交后轮询结果。

```json
{
  "provider": "skillrunner",
  "request": {
    "kind": "skillrunner.job.v1",
    "create": {
      "skill_id": "literature-analysis",
      "skill_source": "local-package"
    },
    "input": {
      "upload": {
        "files": [
          { "key": "source", "from": "selected.markdown" }
        ]
      }
    },
    "poll": {
      "interval_ms": 2000,
      "timeout_ms": 600000
    }
  }
}
```

| 字段 | 说明 |
|------|------|
| `create.skill_id` | 要执行的 skill 标识符 |
| `create.skill_source` | skill 的来源。`"local-package"`（随 package 内置）、`"installed"`（已安装的） |
| `input.upload.files` | 要上传的文件列表。`from` 可以是 `"selected.markdown"`、`"selected.pdf"`、`"selected.source"` |
| `poll.interval_ms` | 轮询间隔（毫秒） |
| `poll.timeout_ms` | 总超时时间（毫秒） |

当工作流选择 ACP 后端时，`skillrunner.job.v1` 会自动适配为 `acp.skill.run.v1`，因此声明为 `skillrunner.job.v1` 的 workflow 也兼容 ACP 后端。

## skillrunner.sequence.v1 — 多步骤技能串联

当需要多个技能按顺序串联执行（前一步的输出作为后一步的输入）时使用序列执行。典型场景包括多阶段 pipeline（如 Topic Synthesis 的三步流程：准备 → 核心增强 → 最终化），每一步由不同的 skill 负责，通过 handoff 机制传递中间结果。

将多个 skill 按顺序串联执行，前一步的输出可以作为后一步的输入（handoff）。

```json
{
  "provider": "acp",
  "request": {
    "kind": "skillrunner.sequence.v1",
    "sequence": {
      "steps": [
        {
          "id": "prepare",
          "skill_id": "create-topic-synthesis-prepare",
          "workspace": "new",
          "parameter": { "language": "zh-CN" }
        },
        {
          "id": "core",
          "skill_id": "topic-synthesis-core-enrichment",
          "workspace": "reuse-workflow",
          "handoff": {
            "from_step": "prepare",
            "pass_through": true
          }
        },
        {
          "id": "finalize",
          "skill_id": "topic-synthesis-finalize",
          "workspace": "reuse-workflow"
        }
      ]
    }
  }
}
```

### 步骤配置

| 字段 | 说明 |
|------|------|
| `id` | 步骤的唯一标识符，供 handoff 引用 |
| `skill_id` | 执行的 skill 标识符 |
| `workspace` | 工作区策略。`"new"`（为每一步创建新工作区）、`"reuse-workflow"`（复用上级工作区） |
| `parameter` | 传递给 skill 的参数 |
| `input` | 传递给 skill 的输入数据 |
| `short_circuit` | 提前终止规则。见下方 |
| `fetch_type` | 按步骤指定获取类型。`"bundle"`（下载 zip 产物包），不指定则使用 workflow 级别的 `result.fetch.type` |

### 提前终止（short_circuit）

当某个步骤的返回值满足条件时，跳过后续步骤，将当前步骤的输出作为最终结果。

```json
{
  "id": "prepare",
  "skill_id": "create-topic-synthesis-prepare",
  "workspace": "new",
  "short_circuit": {
    "when": {
      "path": "status",
      "equals": "canceled"
    },
    "result": "step_output"
  }
}
```

| 字段 | 说明 |
|------|------|
| `when.path` | 检查步骤输出 JSON 中的哪个字段 |
| `when.equals` | 当字段值等于此值时触发终止 |
| `result` | 终止后使用什么作为结果。`"step_output"`（当前步骤的完整输出）、`"none"`（无结果） |

### Handoff 配置

| 字段 | 说明 |
|------|------|
| `from_step` | 从哪一步获取输出 |
| `pass_through` | 是否直接将前置步骤的完整输出传递进来（默认 `true`） |
| `input` | 当 `pass_through: false` 时，**选择性映射**前置步骤输出的字段。键为当前步骤接收的字段名，值为前置步骤输出中的字段路径 |
| `defaults` | 当指定字段为 `undefined` 时的默认值 |

**透传模式（默认）：**

```json
{
  "handoff": {
    "from_step": "prepare",
    "pass_through": true
  }
}
```

前置步骤的**全部输出**直接作为当前步骤的输入。

**选择性映射模式：**

```json
{
  "handoff": {
    "from_step": "emit-secret",
    "pass_through": false,
    "input": {
      "public_marker": "public_marker"
    }
  }
}
```

只提取前置步骤输出中的 `public_marker` 字段传递给当前步骤。适合需要**工作区隔离**（`workspace: "new"`）但仍要传递特定字段的场景。

## generic-http.request.v1 — HTTP API 调用

向 Generic HTTP 后端发送单个 HTTP 请求。

```json
{
  "provider": "generic-http",
  "request": {
    "kind": "generic-http.request.v1"
  }
}
```

常用于调用外部 REST API（如 MinerU PDF 解析服务）。

## generic-http.steps.v1 — 多步骤 HTTP 调用

按顺序执行多个 HTTP 请求步骤。

```json
{
  "provider": "generic-http",
  "request": {
    "kind": "generic-http.steps.v1"
  }
}
```

## 如何选择合适的 provider

| 你的 workflow 需要... | 选择 provider | 请求 kind |
|----------------------|-------------|-----------|
| 纯本地操作，无远程调用 | `pass-through` | `pass-through.run.v1` |
| 向 Skill-Runner 提交一个 skill | `skillrunner` | `skillrunner.job.v1` |
| 多个 skill 串联执行 | `acp` | `skillrunner.sequence.v1` |
| 调用一个 HTTP API | `generic-http` | `generic-http.request.v1` |

注意：`provider` 是唯一决定 workflow 兼容哪些后端的字段。`request.kind` 仅用于路由到正确的执行器，不参与后端兼容性推断。

## 下一步

- [调试与测试](debugging) — 验证 workflow 的请求和响应
- [打包与部署](packaging) — 将 workflow 发布给用户使用
