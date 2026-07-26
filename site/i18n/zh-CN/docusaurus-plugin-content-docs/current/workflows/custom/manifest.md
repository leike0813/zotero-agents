# 工作流清单文件编写

`workflow.json` 是 workflow 的清单文件（Manifest），定义了 workflow 的全部元数据和行为。Workflow Manager 通过此文件发现和加载 workflow。

## 基本结构

```json
{
  "schemaVersion": 2,
  "id": "my-workflow",
  "label": "我的 Workflow",
  "version": "1.0.0",
  "provider": "pass-through",
  "display": {
    "core": false,
    "emoji": "🔧"
  },
  "trigger": { "requiresSelection": true },
  "inputs": {
    "member": { "kind": "parent" },
    "grouping": { "mode": "each" }
  },
  "validateSelection": {
    "select": { "policy": "input-member", "source": "selected" },
    "filters": []
  },
  "parameters": {},
  "execution": {},
  "request": { "kind": "pass-through.run.v1" },
  "hooks": {
    "preflight": "hooks/preflight.mjs",
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

### Input Planning Contracts

`inputs` and `validateSelection` have separate, non-interchangeable roles.
`inputs` is the consumer contract for prepared execution members and grouping;
`validateSelection` is the producer contract for raw-selection validation,
candidate selection, ordered filtering, and candidate cardinality.

#### `inputs` — Execution Input Contract

```json
{
  "inputs": {
    "member": {
      "kind": "attachment",
      "accepts": {
        "mime": ["text/markdown", "text/x-markdown", "application/pdf"]
      }
    },
    "grouping": { "mode": "parent" }
  }
}
```

- `member.kind`: `selection`, `parent`, `child`, `attachment`,
  `note`, `generated-note`, or `digest-image-target`.
- `member.accepts.mime` applies only to attachment execution members.
- `grouping.mode: "each"` creates one unit per candidate.
- `grouping.mode: "all"` creates one unit containing all candidates.
- `grouping.mode: "parent"` creates stable parent groups. Candidates without
  parent identity are skipped as `missing-parent`.

#### `validateSelection` — Candidate Production Contract {#selection-validation}

```json
{
  "validateSelection": {
    "require": {
      "selection": {
        "counts": {
          "parents": { "min": 1 },
          "total": { "min": 1 }
        },
        "allowMixed": false
      },
      "candidates": { "min": 1 }
    },
    "select": {
      "policy": "input-member",
      "source": "related"
    },
    "filters": [
      {
        "kind": "source-file-exists",
        "phase": "availability"
      }
    ]
  }
}
```

`require.selection` checks the raw SelectionContext exactly once.
`select` then produces ordered atomic candidates. MIME compatibility and
`filters` run before `require.candidates`. Count rules use either
`{ "exact": n }` or non-negative `min`/`max` values.

Supported selectors are `input-member` (`source: selected|related`),
`selection`, `literature-source`, `generated-note-candidates`, and
`digest-representative-image`. Supported filters are
`source-file-exists`, `candidates-per-parent`,
`generated-note-kinds-absent`, and `artifact-absent`. Parameter-dependent
artifact checks require `phase: "execute"`; availability filters run during
preview and are reapplied during confirmed planning.

#### `trigger` — Empty-selection Gate

```json
{
  "trigger": {
    "requiresSelection": true
  }
}
```

`trigger.requiresSelection` is required in schema v2. It controls only whether
an empty selection may enter planning; it does not replace
`require.selection`.
### 执行控制

```json
{
  "execution": {
    "timeout_ms": 600000,
    "poll_interval_ms": 2000,
    "mcp": {
      "requiredTools": ["search_items", "get_item_detail"]
    },
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
|-------|-------------|
| `timeout_ms` | 超时时间（毫秒，仅对 Generic HTTP 后端有效） |
| `poll_interval_ms` | 轮询间隔（毫秒），控制进度检查频率 |
| `mcp.requiredTools` | 此 workflow 所需的 MCP 工具列表（工具名称字符串数组） |
| `zoteroHostAccess.required` | 是否需要 Zotero 主机访问权限（读写库数据） |
| `zoteroHostAccess.allowWriteApprovalBypass` | 是否允许绕过写操作审批 |
| `feedback.showNotifications` | 是否显示执行通知。默认 `true`，设为 `false` 可静默执行 |

> **执行模式**（`auto` / `interactive`）已移至 `request.create.mode`——参见 [请求种类](request-kinds)。

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
    "preflight": "hooks/preflight.mjs",
    "buildRequest": "hooks/buildRequest.mjs",
    "normalizeSettings": "hooks/normalizeSettings.mjs",
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

| 字段 | 必需 | 说明 |
|------|------|------|
| `applyResult` | ✅ | **必需**。执行后处理结果的脚本路径 |
| `preflight` | | 可选。在选择解析之后、请求构造之前运行。可继续、跳过、短路到 `applyResult`，或将一个输入单元替换为多个虚拟请求单元 |
| `buildRequest` | | 可选。构建发送给后端的请求。与 `request` 字段互斥 |
| `normalizeSettings` | | 可选。规范化用户设置参数 |

> **输入过滤**已被声明式 `validateSelection` 机制替代——参见 [选择验证](#selection-validation) 章节。

`preflight` 不参与菜单启用判断、debug-probe 选择分类或 Host Bridge 就绪检查。请将选择约束放在 `validateSelection` 中，将后端请求构造放在 `buildRequest` 或 `request` 中，将 Zotero 写入放在 `applyResult` 中。

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
  "schemaVersion": 2,
  "id": "my-literature-analysis",
  "label": "我的文献分析",
  "version": "1.0.0",
  "provider": "skillrunner",
  "display": { "emoji": "📄" },
  "trigger": { "requiresSelection": true },
  "inputs": {
    "member": {
      "kind": "attachment",
      "accepts": { "mime": ["application/pdf"] }
    },
    "grouping": { "mode": "each" }
  },
  "validateSelection": {
    "require": {
      "selection": {
        "counts": { "attachments": { "min": 1 } },
        "allowMixed": false
      }
    },
    "select": { "policy": "input-member", "source": "selected" },
    "filters": [
      { "kind": "source-file-exists", "phase": "availability" }
    ]
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
