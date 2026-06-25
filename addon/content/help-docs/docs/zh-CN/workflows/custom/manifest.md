# 工作流清单文件编写

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

### validateSelection — 选择验证

`validateSelection` 是声明式的选择验证，覆盖常见的"跳过已有结果的条目"或"只接受特定类型的选择"等场景——无需编写任何 JavaScript。

```json
{
  "validateSelection": {
    "select": {
      "policy": "literature-source"
    },
    "require": {
      "counts": {
        "parents": 1
      },
      "allowMixed": false
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

### `select` — 选择策略

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `select.policy` | string | 选择策略。支持以下值 |
| `select.unit` | string | 覆盖选择验证的输入单元类型：`"attachment"` / `"parent"` / `"note"` / `"workflow"` |

**支持的 `select.policy` 值：**

| 策略 | 说明 |
|--------|-------------|
| `input-unit` | 接受与输入单元匹配的条目 |
| `literature-source` | 接受文献来源（附件或可展开附件的父条目） |
| `pdf-attachment` | 仅接受 PDF 附件 |
| `selected-parent` | 接受选中条目中的父条目 |
| `generated-note-candidates` | 接受生成笔记的候选条目 |
| `digest-representative-image` | 代表图提取的目标条目 |

### `require` — 选择要求

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `require.counts.parents` | number | 最少要求的父条目数 |
| `require.counts.attachments` | number | 最少要求的附件数 |
| `require.counts.notes` | number | 最少要求的笔记数 |
| `require.counts.children` | number | 最少要求的子条目数 |
| `require.counts.total` | number | 最少要求的总条目数 |
| `require.allowMixed` | boolean | 是否允许混合选择不同类型的条目 |

### `exclude` — 排除规则

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `exclude[]` | array | 排除规则列表。命中任一规则则跳过当前条目 |

**支持的 `exclude.kind` 值：**

| kind | 说明 | 附加参数 |
|------|-------------|----------------------|
| `generated-notes-all` | 条目下已有指定类型的生成笔记 | `noteKinds`：笔记类型列表，如 `["digest", "references", "citation-analysis"]` |
| `artifact-exists` | 条目下已有指定产物（避免重复执行） | `target`：`"deep-reading-html"` / `"translator-markdown"` / `"mineru-markdown"`；`parameter`：用于产物匹配的可选语言参数 |

### `derive` — 派生选择

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `derive[]` | array | 派生选择操作。`"exportCandidates"` — 派生笔记导出候选；`"digestRepresentativeImageTarget"` — 从摘要笔记派生代表图目标 |

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

> **执行模式**（`auto` / `interactive`）已移至 `request.create.mode`——参见 [请求种类](#doc/workflows%2Fcustom%2Frequest-kinds)。

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

有关各 `kind` 的详细说明，参见[请求种类](#doc/workflows%2Fcustom%2Frequest-kinds)。

### Hook 声明

```json
{
  "hooks": {
    "buildRequest": "hooks/buildRequest.mjs",
    "normalizeSettings": "hooks/normalizeSettings.mjs",
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

| 字段 | 必需 | 说明 |
|------|------|------|
| `applyResult` | ✅ | **必需**。执行后处理结果的脚本路径 |
| `buildRequest` | | 可选。构建发送给后端的请求。与 `request` 字段互斥 |
| `normalizeSettings` | | 可选。规范化用户设置参数 |

> **输入过滤**已被声明式 `validateSelection` 机制替代——参见 [选择验证](#selection-validation) 章节。

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

参见[本地化](#doc/workflows%2Fcustom%2Flocalization)页面获取详细说明。

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

- [Hook 系统](#doc/workflows%2Fcustom%2Fhooks) — 了解各 Hook 的 API 签名和编写方法
- [参数系统](#doc/workflows%2Fcustom%2Fparameters) — 参数类型、枚举值、动态选项源
- [选择和上下文](#doc/workflows%2Fcustom%2Fselection-context) — 如何获取用户选择的条目信息
