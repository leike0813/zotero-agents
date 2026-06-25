# 本地化

Workflow 系统支持多语言本地化，允许同一个 workflow 在不同语言的 Zotero 界面中显示对应的名称和描述。

## 本地化层级

Workflow 的本地化按以下优先级回退：

```
内联消息（manifest.i18n.messages）  ← 最高优先级
        ↓
包级 locale 文件（workflow-package 的 locales/）
        ↓
原始清单字段（label / description 等英文默认值）
        ↓
Key 回退（如 "workflows.my-id.label"）
```

## 内联本地化（单 workflow）

直接在 `workflow.json` 中定义：

```json
{
  "id": "my-workflow",
  "label": "My Workflow",
  "i18n": {
    "defaultLocale": "en-US",
    "messages": {
      "zh-CN": {
        "label": "我的工作流",
        "taskNameTemplate": "处理中: {query}",
        "parameters.language.title": "语言",
        "parameters.language.description": "选择输出内容的语言"
      },
      "ja-JP": {
        "label": "マイワークフロー",
        "taskNameTemplate": "処理中: {query}"
      }
    }
  }
}
```

原始清单中的 `label`、`taskNameTemplate` 等字段作为默认值（通常是英文），`i18n.messages` 中的翻译会覆盖对应语言下的显示文本。

### 键命名规范

```
label                                    — workflow 名称
taskNameTemplate                         — 任务名称模板
parameters.<paramKey>.title              — 参数标题
parameters.<paramKey>.description         — 参数描述
```

## 包级本地化（多 workflow 包）

在 `workflow-package.json` 中声明 locale 文件：

```json
{
  "id": "my-package",
  "i18n": {
    "defaultLocale": "en-US",
    "locales": {
      "zh-CN": "locales/zh-CN.json",
      "ja-JP": "locales/ja-JP.json"
    }
  }
}
```

`locales/zh-CN.json` 文件内容：

```json
{
  "workflows.my-workflow.label": "我的工作流",
  "workflows.my-workflow.taskNameTemplate": "处理中: {query}",
  "workflows.my-workflow.parameters.language.title": "语言",
  "workflows.another-workflow.label": "另一个工作流"
}
```

包级 locale 文件的键使用完全限定格式：`workflows.<workflowId>.<field>`。

### 混合使用

包级和 workflow 内联消息可以共存，内联消息的优先级更高。最佳实践是：

- 默认语言（如英文）保留在 workflow.json 的字段中
- 翻译放在包级 locale 文件中，便于统一管理
- 如果某个翻译非常特定于某个 workflow，也可以放在 workflow 的内联消息中

## 语言匹配逻辑

系统会按以下顺序尝试匹配用户的语言设置：

1. **精确匹配**：用户的 locale 为 `"zh-CN"`，查找 `"zh-CN"` 的消息
2. **语言子标签匹配**：用户的 locale 为 `"zh-Hans-CN"`，找不到精确匹配时尝试匹配 `"zh"`
3. **defaultLocale 回退**：使用 `i18n.defaultLocale` 指定的语言
4. **字段原始值回退**：使用 `workflow.json` 中字段的原始值（如 `label`）
5. **Key 回退**：显示键名本身

## 参数值枚举的本地化

如果参数有枚举值，枚举值的显示文本目前使用参数的 `title` 和 `description` 字段。对于需要本地化枚举值自身的复杂场景，建议在 workflow 的 `label` 或描述中说明。

## 为 Workflow 添加新语言

1. 在 package 的 `locales/` 目录下新建 `<locale>.json` 文件
2. 参考已有的 locale 文件（如 `zh-CN.json`），翻译所有键
3. 在 `workflow-package.json` 的 `i18n.locales` 中添加新语言条目
4. 重新加载插件后即可生效

## 参考

- 官方 locale 文件示例：`content/official/workflows/literature-workbench-package/locales/zh-CN.json`
- 包级 i18n 声明示例：`content/official/workflows/literature-workbench-package/workflow-package.json`

## 下一步

- [请求种类](#doc/workflows%2Fcustom%2Frequest-kinds) — 选择执行后端和请求类型
- [打包与部署](#doc/workflows%2Fcustom%2Fpackaging) — 发布带有本地化的 workflow 包
