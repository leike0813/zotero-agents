# Zotero Bridge CLI 诊断命令

选择准确的规范操作后，使用此生成参考查阅 `debug` 或 `call` 命令。

## `zotero-bridge call`

执行高级诊断用的原始 capability 调用

- Argv： `["call"]`.
- Argv 绑定： `[{"property":"capability","kind":"positional","token":"CAPABILITY","position":1,"takesValue":true,"required":true,"valueNames":["CAPABILITY"]},{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"capability":{"type":"string","description":"Capability name, for example library.get_item_detail","position":1},"input":{"type":"string","description":"Capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":["capability"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"capability":{"type":"string","description":"Capability name, for example library.get_item_detail"},"input":{"type":"string","description":"Capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `debug`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"service","target":"POST /bridge/v1/call"}]`.
- 别名： `call`, `capability`, `CAPABILITY`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug acp-skill-run reapply-result`

对一个现有 ACP Skill run 结果重新执行 applyResult

- Argv： `["debug","acp-skill-run","reapply-result"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `maintenance`；危险级别： `review`.
- Effects： `[{"kind":"debug-repair","stateChanged":true,"description":"May change debug repair state."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.acpSkillRun.reapplyResult"}]`.
- 别名： `debug acp-skill-run reapply-result`, `debug`, `acp-skill-run`, `reapply-result`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug persistence`

读取仅用于调试的持久化诊断信息

- Argv： `["debug","persistence"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `debug`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.persistence.snapshot"}]`.
- 别名： `debug persistence`, `debug`, `persistence`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug status`

读取仅用于调试的 Zotero Bridge 服务运行时状态

- Argv： `["debug","status"]`.
- Argv 绑定： `[]`.
- 调用 schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `debug`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.status"}]`.
- 别名： `debug status`, `debug`, `status`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug synthesis cache`

列出仅用于调试的 Synthesis sidecar cache basis 行

- Argv： `["debug","synthesis","cache"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `debug`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.synthesis.cache.list"}]`.
- 别名： `debug synthesis cache`, `debug`, `synthesis`, `cache`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug synthesis clean-install-reset`

危险调试操作：重置 Synthesis 安装状态

- Argv： `["debug","synthesis","clean-install-reset"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `maintenance`；危险级别： `high`.
- Effects： `[{"kind":"debug-repair","stateChanged":true,"description":"May change debug repair state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.synthesis.cleanInstallReset"}]`.
- 别名： `debug synthesis clean-install-reset`, `debug`, `synthesis`, `clean-install-reset`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug synthesis diff`

读取仅用于调试的 Synthesis DB/cache 差异

- Argv： `["debug","synthesis","diff"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `debug`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.synthesis.diff"}]`.
- 别名： `debug synthesis diff`, `debug`, `synthesis`, `diff`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug synthesis inspect-paper`

检查一篇调试用 Synthesis paper

- Argv： `["debug","synthesis","inspect-paper"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `debug`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.synthesis.paper.inspect"}]`.
- 别名： `debug synthesis inspect-paper`, `debug`, `synthesis`, `inspect-paper`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug synthesis inspect-topic`

检查一个调试用 Synthesis topic

- Argv： `["debug","synthesis","inspect-topic"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `debug`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.synthesis.topic.inspect"}]`.
- 别名： `debug synthesis inspect-topic`, `debug`, `synthesis`, `inspect-topic`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug synthesis operations`

列出仅用于调试的 Synthesis 显式操作

- Argv： `["debug","synthesis","operations"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `debug`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.synthesis.operations.list"}]`.
- 别名： `debug synthesis operations`, `debug`, `synthesis`, `operations`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug synthesis profiler`

列出仅用于调试的 Synthesis profiler 计时

- Argv： `["debug","synthesis","profiler"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `debug`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.synthesis.profiler.list"}]`.
- 别名： `debug synthesis profiler`, `debug`, `synthesis`, `profiler`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug synthesis snapshot`

读取一个仅用于调试的 Synthesis snapshot

- Argv： `["debug","synthesis","snapshot"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `debug`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.synthesis.snapshot"}]`.
- 别名： `debug synthesis snapshot`, `debug`, `synthesis`, `snapshot`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug tasks`

读取仅用于调试的 workflow task 诊断信息

- Argv： `["debug","tasks"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `debug`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.tasks.snapshot"}]`.
- 别名： `debug tasks`, `debug`, `tasks`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.
