# 参数系统

Workflow 可以定义可配置的参数，在运行前弹出设置对话框让用户填写。参数系统支持多种类型和动态数据源。

## 参数定义

参数定义在 `workflow.json` 的 `parameters` 字段中：

```json
{
  "parameters": {
    "language": {
      "type": "string",
      "title": "输出语言",
      "description": "选择输出内容的语言",
      "default": "zh-CN",
      "enum": ["zh-CN", "en-US", "ja-JP"],
      "allowCustom": true
    },
    "maxResults": {
      "type": "number",
      "title": "最大结果数",
      "description": "返回结果的数量上限",
      "default": 10,
      "min": 1,
      "max": 100
    },
    "enableFilter": {
      "type": "boolean",
      "title": "启用过滤",
      "description": "是否启用结果过滤",
      "default": true,
      "visible_if": { "parameter": "language", "equals": false }
    }
  }
}
```

## 参数类型

| 类型 | 说明 | 适用控件 |
|------|------|---------|
| `string` | 文本字符串 | 文本框 / 下拉选择 / 动态选择器 |
| `number` | 数字 | 数字输入框（支持 min/max 约束） |
| `boolean` | 布尔值 | 开关 / 复选框 |

## 枚举值与自定义值

```json
{
  "language": {
    "type": "string",
    "enum": ["zh-CN", "en-US", "ja-JP"],
    "allowCustom": true,
    "default": "zh-CN"
  }
}
```

- `enum`：建议的预设值列表。下拉菜单中显示为可选选项
- `allowCustom`（仅 string 类型）：设为 `true` 时，`enum` 仅为推荐值，用户可自由输入其他值。设为 `false` 或省略时，用户只能从 `enum` 中选择

## 条件显示

```json
{
  "advancedMode": {
    "type": "boolean",
    "title": "高级模式",
    "default": false
  },
  "customEndpoint": {
    "type": "string",
    "title": "自定义端点",
    "visible_if": { "parameter": "advancedMode", "equals": true }
  }
}
```

`visible_if` 控制参数在设置对话框中的显示/隐藏：

- `equals: true` — 目标参数值为 truthy 时才显示
- `equals: false` — 目标参数值为 falsy 时才显示

**示例：联动显示/隐藏**

```json
{
  "auto_tag_regulator": {
    "type": "boolean",
    "title": "Auto Tag Regulator",
    "default": true
  },
  "auto_tag_infer_tag": {
    "type": "boolean",
    "title": "Infer tags",
    "default": true,
    "visible_if": { "parameter": "auto_tag_regulator", "equals": true }
  }
}
```

当 `auto_tag_regulator` 未勾选时，`auto_tag_infer_tag` 参数会自动隐藏。

## 动态选项源

参数的值选项可以来自 Zotero 的实时数据：

```json
{
  "targetCollection": {
    "type": "string",
    "title": "目标合集",
    "default": "",
    "optionsSource": {
      "kind": "zotero.collections",
      "library": "current",
      "includeEmpty": true,
      "valueFormat": "collectionRef",
      "labelFormat": "path"
    }
  },
  "relatedTopic": {
    "type": "string",
    "title": "关联主题",
    "optionsSource": {
      "kind": "synthesis.topics",
      "filter": "updatable"
    }
  }
}
```

### 支持的选项源

| `kind` | 说明 | 可用参数 |
|--------|------|---------|
| `zotero.collections` | 当前 Zotero 库中的合集列表 | `library`（current/user/number）、`includeEmpty`、`valueFormat`（collectionRef）、`labelFormat`（path/title） |
| `synthesis.topics` | Synthesis 工作台中的主题列表 | `filter`（all/updatable）、`valueFormat`（topicId）、`labelFormat`（title） |

### optionsSource 通用参数

| 参数 | 说明 |
|------|------|
| `library` | 库范围。`"current"`（当前库）、`"user"`（用户库）、数字（指定库 ID） |
| `includeEmpty` | 是否包含空选项（用于"不选择"） |
| `valueFormat` | 选项值的格式：`"collectionRef"` / `"topicId"` |
| `labelFormat` | 选项标签的显示格式：`"path"` / `"title"` |
| `allowStale` | 允许使用缓存数据（避免每次打开设置都重新请求） |
| `filter` | 过滤条件（因 kind 而异） |

## 数字参数的约束

```json
{
  "confidence": {
    "type": "number",
    "title": "置信度阈值",
    "default": 0.8,
    "min": 0,
    "max": 1
  }
}
```

`min` 和 `max` 约束输入值的范围。

## 在 Hook 中读取参数

在 `buildRequest`、`normalizeSettings` 和 `applyResult` 中，可以通过 `executionOptions.workflowParams` 读取用户设置的参数值：

```js
export function buildRequest({ executionOptions, runtime }) {
  const params = executionOptions?.workflowParams || {};
  const language = params.language || "zh-CN";
  const maxResults = params.maxResults || 10;

  return {
    kind: "skillrunner.job.v1",
    create: { skill_id: "my-skill" },
    parameter: { language, max_results: maxResults },
  };
}
```

## 参数本地化

参数的 `title` 和 `description` 支持本地化：

```json
{
  "i18n": {
    "messages": {
      "zh-CN": {
        "parameters.language.title": "语言",
        "parameters.language.description": "选择输出内容的语言"
      }
    }
  }
}
```

完整的本地化机制参见[本地化](localization)页面。

## 下一步

- [选择上下文](selection-context) — 理解用户的条目选择是如何传递给 workflow 的
- [请求种类](request-kinds) — 不同请求种类的参数传递方式
