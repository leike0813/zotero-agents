## Why

受控词表无法自动暴露库内不规范标签，且 Synthesis Workbench 的 Index 不能直接对需要处理的条目执行分析或标签规范化。新条目进入 Index 时也应立即获得一致的标签合规状态。

## What Changes

- 新增本地 `tag-auditor` workflow，用受控词表审计当前库的顶层常规条目并保存标签规范化状态。
- 新增单一的、可被 workflow 和 Index 自动审计共用的标签合规判定器。
- 在 Index 条目首次进入显示模型时执行标签检查，并将结果投影为可操作状态。
- 在 Index 表增加本地化 Actions 列，支持 Analyze 和 Regulate tags 两个按条目执行的操作。
- 在 Tag Regulator 成功应用后清除对应条目的待规范化标记，同时保留已审计记录。

## Capabilities

### New Capabilities

- `tag-compliance-audit`: 受控词表标签判定、审计记录与 tag-auditor workflow。
- `synthesis-workbench-index-actions`: Index 自动标签审计及按条目工作流操作。

### Modified Capabilities

- `literature-workbench-package`: 内置 literature workbench package 增加 tag-auditor workflow 与其本地化、注册约束。

## Impact

- `workflows_builtin/literature-workbench-package` 的 workflow、共享库、清单和 locale。
- Synthesis 本地存储、Index DTO/服务、Workbench bridge 和 Web UI。
- Tag Regulator 结果应用、Synthesis UI/服务测试及 workflow manifest/localization 校验。
