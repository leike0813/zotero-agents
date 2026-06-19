# Workflow 清单文件编写

`workflow.json` 是 workflow 的清单文件（Manifest），定义了 workflow 的全部元数据和行为。Workflow Manager 通过此文件发现和加载 workflow。

## 基本结构

```json
{
  "id": "my-workflow",
  "label": "我的 Workflow",
  "version": "1.0.0",
  "provider": "pass-through",
  "display": {
    "core": false,
    "emoji": "🔧"
  },
  "inputs": { "unit": "parent" },
  "parameters": {},
  "execution": {},
  "request": { "kind": "pass-through.run.v1" },
  "hooks": {
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

## 字段详解

### 基本标识

| 字段 | 必需 | 类型 | 说明 |
|------|------|------|------|
| `id` | ✅ | string | 唯一标识符，不可重复。推荐使用 kebab-case |
| `label` | ✅ | string | 用户可见的显示名称 |
| `version` | | string | 语义版本号，如 `"1.0.0"` |
| `provider` | ✅ | string | 后端类型。可选值见下文 |

### provider 可选值

| 值 | 说明 |
|------|------|
| `"pass-through"` | 纯本地执行，无需后端。适用于文件操作、导出等 |
| `"skillrunner"` | 通过 Skill-Runner 后端执行 skill |
| `"acp"` | 通过 ACP 后端执行 skill |
| `"generic-http"` | 通过 Generic HTTP 后端调用 API |

`provider` 决定 workflow 与哪种类型的后端兼容，也决定了 Dashboard 中显示哪些后端可执行。

### 显示控制

```json
{
  "display": {
    "core": true,
    "emoji": "📊"
  },
  "taskNameTemplate": "Processing: {query}",
  "debug_only": false
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `display.core` | boolean | 是否标记为核心 workflow（在 Dashboard 中优先展示、加 core 徽章） |
| `display.emoji` | string | 显示名前缀图标，如 `"📖"` |
| `taskNameTemplate` | string | 任务名称模板，用 `{参数名}` 占位，执行时将替换为实际值 |
| `debug_only` | boolean | `true` 时仅在调试模式下可见 |

### 输入定义

```json
{
  "inputs": {
    "unit": "attachment",
    "accepts": {
      "mime": ["text/markdown", "text/x-markdown", "application/pdf"]
    },
    "per_parent": {
      "min": 1,
      "max": 1
    }
  }
}
```

| 字段 | 说明 |
|------|------|
| `unit` | **输入单元类型**。`"attachment"`（附件）、`"parent"`（父条目）、`"note"`（笔记）、`"workflow"`（无需选择条目，从 Dashboard 直接触发） |
| `accepts.mime` | 接受的 MIME 类型（仅 `unit: "attachment"` 时适用）。不指定则接受所有类型 |
| `per_parent.min` | 每个父条目最小附件数 |
| `per_parent.max` | 每个父条目最大附件数 |

当 `unit: "workflow"` 时，不需要用户选中任何条目即可触发（如"创建 Topic 综合"）。

### 选择验证（validateSelection）

`validateSelection` 是声明式的选择验证——无需编写 `filterInputs` Hook。用于常见的"跳过已有结果的条目"、"只接受特定类型的选择"等场景。

**与 `filterInputs` 的关系：** 这两个字段**互斥**。声明式 `validateSelection` 能覆盖的场景不需要写 JS 代码；复杂逻辑才用 `filterInputs`。

```json
{
  "validateSelection": {
    "select": {
      "policy": "literature-source"
    },
    "exclude": [
      {
        "kind": "generated-notes-all",
        "noteKinds": ["digest", "references", "citation-analysis"]
      }
    ]
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `select.policy` | string | 选择策略。`"literature-source"` 接受文献来源（附件或可展开附件的父条目） |
| `exclude[]` | array | 排除规则列表。命中任一规则则跳过当前条目 |

**支持的 `exclude.kind`：**

| kind | 说明 | 附加参数 |
|------|------|---------|
| `generated-notes-all` | 条目下已有指定类型的生成笔记 | `noteKinds`：笔记类型列表，如 `["digest", "references", "citation-analysis"]` |
| `artifact-exists` | 条目下已有指定产物（避免重复执行） | `target`：产物标识，如 `"deep-reading-html"` |

**示例：**

```json
{
  "validateSelection": {
    "select": { "policy": "literature-source" },
    "exclude": [
      { "kind": "artifact-exists", "target": "deep-reading-html" }
    ]
  }
}
```

> 此例中，已有深度阅读 HTML 产物的条目会被自动跳过，无需用户手动筛选。

### 触发控制

```json
{
  "trigger": {
    "requiresSelection": false
  }
}
```

| 字段 | 说明 |
|------|------|
| `requiresSelection` | 是否需要用户选中条目才能触发。默认 `true`。设为 `false` 后不需要选条目即可从 Dashboard 运行。当 `inputs.unit: "workflow"` 时通常设为 `false` |

### 执行控制

```json
{
  "execution": {
    "mode": "auto",
    "skillrunner_mode": "auto",
    "timeout_ms": 600000,
    "poll_interval_ms": 2000,
    "zoteroHostAccess": {
      "required": false,
      "allowWriteApprovalBypass": false
    },
    "feedback": {
      "showNotifications": true
    }
  }
}
```

| 字段 | 说明 |
|------|------|
| `mode` | 执行模式。`"auto"`（自动）、`"sync"`（同步）、`"async"`（异步） |
| `skillrunner_mode` | SkillRunner 交互模式。`"auto"`（非交互）、`"interactive"`（交互，需要用户输入） |
| `timeout_ms` | 超时时间（毫秒） |
| `poll_interval_ms` | 轮询间隔（毫秒），控制进度检查频率 |
| `zoteroHostAccess.required` | 是否需要 Zotero 主机访问权限（读写库数据） |
| `zoteroHostAccess.allowWriteApprovalBypass` | 是否允许绕过写操作审批 |
| `feedback.showNotifications` | 是否显示执行通知。默认 `true`，设为 `false` 可静默执行 |

### 结果获取

```json
{
  "result": {
    "fetch": { "type": "bundle" },
    "final_step_id": "finalize",
    "expects": {
      "result_json": "result/result.json",
      "artifacts": [
        "result/artifact1",
        "result/artifact2"
      ]
    }
  }
}
```

| 字段 | 说明 |
|------|------|
| `fetch.type` | 获取方式。`"bundle"`（下载 zip 包）、`"result"`（仅获取结果 JSON） |
| `final_step_id` | 对于 sequence 工作流，指定最后一步的 id，用于确定最终结果 |
| `expects.result_json` | 期望的结果 JSON 文件路径（相对于运行时工作区） |
| `expects.artifacts` | 期望的产物文件路径列表 |

### 请求定义

声明式请求定义，与 `hooks.buildRequest` **互斥**（如果同时存在，`hooks.buildRequest` 优先）。

```json
{
  "request": {
    "kind": "skillrunner.job.v1",
    "create": {
      "skill_id": "my-skill",
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

有关各 `kind` 的详细说明，参见[请求种类](request-kinds)。

### Hook 声明

```json
{
  "hooks": {
    "filterInputs": "hooks/filterInputs.mjs",
    "buildRequest": "hooks/buildRequest.mjs",
    "normalizeSettings": "hooks/normalizeSettings.mjs",
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

| 字段 | 必需 | 说明 |
|------|------|------|
| `applyResult` | ✅ | **必需**。执行后处理结果的脚本路径 |
| `filterInputs` | | 可选。预处理用户的输入选择，过滤/筛选条目 |
| `buildRequest` | | 可选。构建发送给后端的请求。与 `request` 字段互斥 |
| `normalizeSettings` | | 可选。规范化用户设置参数 |

路径是相对于 `workflow.json` 所在目录的。

### 本地化

```json
{
  "i18n": {
    "defaultLocale": "en-US",
    "messages": {
      "zh-CN": {
        "label": "我的工作流",
        "parameters.language.title": "语言"
      }
    }
  }
}
```

参见[本地化](localization)页面获取详细说明。

### 完整示例：一个带参数的文献分析 workflow

```json
{
  "id": "my-literature-analysis",
  "label": "我的文献分析",
  "version": "1.0.0",
  "provider": "skillrunner",
  "display": { "emoji": "📄" },
  "inputs": {
    "unit": "attachment",
    "accepts": { "mime": ["application/pdf"] },
    "per_parent": { "min": 1, "max": 1 }
  },
  "parameters": {
    "language": {
      "type": "string",
      "title": "输出语言",
      "default": "zh-CN",
      "enum": ["zh-CN", "en-US"],
      "allowCustom": true
    }
  },
  "execution": {
    "mode": "auto",
    "skillrunner_mode": "auto",
    "timeout_ms": 600000
  },
  "request": {
    "kind": "skillrunner.job.v1",
    "create": { "skill_id": "literature-analysis" }
  },
  "result": {
    "fetch": { "type": "bundle" },
    "expects": {
      "result_json": "result/result.json"
    }
  },
  "hooks": {
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

## 下一步

- [Hook 系统](hooks) — 了解各 Hook 的 API 签名和编写方法
- [参数系统](parameters) — 参数类型、枚举值、动态选项源
- [选择和上下文](selection-context) — 如何获取用户选择的条目信息
