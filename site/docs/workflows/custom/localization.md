# Localization

The workflow system supports multi-language localization, allowing the same workflow to display corresponding names and descriptions in different language Zotero interfaces.

## Localization Hierarchy

Workflow localization falls back in the following priority order:

```
Inline messages (manifest.i18n.messages)  ← Highest priority
        ↓
Package-level locale files (workflow-package's locales/)
        ↓
Raw manifest fields (label / description etc. English defaults)
        ↓
Key fallback (e.g., "workflows.my-id.label")
```

## Inline Localization (Single Workflow)

Defined directly in `workflow.json`:

```json
{
  "id": "my-workflow",
  "label": "My Workflow",
  "i18n": {
    "defaultLocale": "en-US",
    "messages": {
      "zh-CN": {
        "label": "我的 Workflow",
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

Fields like `label` and `taskNameTemplate` in the raw manifest serve as defaults (usually English), and translations in `i18n.messages` override the display text for the corresponding language.

### Key Naming Conventions

```
label                                    — Workflow name
taskNameTemplate                         — Task name template
parameters.<paramKey>.title              — Parameter title
parameters.<paramKey>.description         — Parameter description
skills.<skillId>.name                    — skill display name under the current workflow
```

`skills.<skillId>.name` only affects the display name in the UI. The Skill package's `runner.json.name` remains the skill's default name; if the workflow does not declare a corresponding translation, the interface falls back to displaying `runner.json.name`.

## Package-Level Localization (Multi-Workflow Package)

Declare locale files in `workflow-package.json`:

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

Contents of `locales/zh-CN.json`:

```json
{
  "workflows.my-workflow.label": "我的工作流",
  "workflows.my-workflow.taskNameTemplate": "处理中: {query}",
  "workflows.my-workflow.skills.my-skill.name": "我的技能",
  "workflows.my-workflow.parameters.language.title": "语言",
  "workflows.another-workflow.label": "另一个工作流"
}
```

Keys in package-level locale files use the fully qualified format: `workflows.<workflowId>.<field>`.

### Mixed Usage

Package-level and workflow inline messages can coexist, with inline messages having higher priority. Best practices:

- Keep the default language (e.g., English) in the workflow.json fields
- Place translations in package-level locale files for unified management
- If a translation is very specific to a particular workflow, it can also be placed in the workflow's inline messages

## Language Matching Logic

The system attempts to match the user's language settings in the following order:

1. **Exact Match**: User's locale is `"zh-CN"`, look up `"zh-CN"` messages
2. **Language Subtag Match**: User's locale is `"zh-Hans-CN"`, if no exact match is found, try matching `"zh"`
3. **defaultLocale Fallback**: Use the language specified by `i18n.defaultLocale`
4. **Raw Field Value Fallback**: Use the raw field values in `workflow.json` (e.g., `label`)
5. **Key Fallback**: Display the key name itself

## Localization of Parameter Value Enums

If a parameter has enum values, the display text for enum values currently uses the parameter's `title` and `description` fields. For complex scenarios requiring localization of the enum values themselves, it is recommended to explain this in the workflow's `label` or description.

## Adding a New Language to a Workflow

1. Create a new `<locale>.json` file in the package's `locales/` directory
2. Refer to existing locale files (e.g., `zh-CN.json`) and translate all keys
3. Add the new language entry in `workflow-package.json`'s `i18n.locales`
4. Reload the plugin to take effect

## Reference

- Official locale file example: `content/official/workflows/literature-workbench-package/locales/zh-CN.json`
- Package-level i18n declaration example: `content/official/workflows/literature-workbench-package/workflow-package.json`

## Next Steps

- [Request Kinds](request-kinds) — Choose execution backend and request type
- [Packaging & Deployment](packaging) — Publish workflow packages with localization
