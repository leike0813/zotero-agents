
# workflows_builtin/literature-workbench-package/lib/remote.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/remote.mjs -->

标签词表的 GitHub 远端同步模块：读取已发布词表基线、比对并回写托管版本，同时提供变更订阅能力。
源码：[workflows_builtin/literature-workbench-package/lib/remote.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/remote.mjs)

## 符号（6）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/remote.mjs:buildPublishedVocabularyPayload -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/remote.mjs:fetchJsonOrThrow -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/remote.mjs:fetchPublishBaseline -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/remote.mjs:publishRemoteVocabulary -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/remote.mjs:putPublishedVocabulary -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/remote.mjs:subscribeRemoteVocabulary -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildPublishedVocabularyPayload | 函数 | 92–120 | 中等 | serialization、tag-vocabulary、remote-sync | 0 | 将本地受控词表序列化为符合远端词表 schema 的 payload，并归一化标签与父级绑定。 |
| fetchJsonOrThrow | 函数 | 48–64 | 简单 | network、error-handling、utility | 0 | 发起 JSON 请求并把非 2xx 响应与解析失败统一转成带状态码的错误。 |
| fetchPublishBaseline | 函数 | 66–90 | 简单 | remote-sync、github-api、network | 0 | 拉取远端已发布词表文件的 base64 内容与提交 SHA，作为并发发布比对基线。 |
| publishRemoteVocabulary | 函数 | 145–230 | 复杂 | remote-sync、orchestration、tag-vocabulary、github-api | 0 | 编排完整的发布流程：读取基线、比较差异、写入受控与暂存分区，并返回发布结果与诊断信息。 |
| putPublishedVocabulary | 函数 | 122–143 | 简单 | remote-sync、github-api、concurrency | 0 | 以期望 SHA 乐观锁方式把词表 payload 写回 GitHub Contents API，冲突时抛出可重试信号。 |
| subscribeRemoteVocabulary | 函数 | 232–276 | 中等 | remote-sync、polling、event-handler | 0 | 按轮询间隔拉取远端词表并比较指纹，检测到外部更新时触发回调并刷新本地快照。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [model.mjs](model.mjs.md) | workflows_builtin/literature-workbench-package/lib/model.mjs | 标签词表领域模型：定义偏好键常量与分面（FACETS），并实现 parent binding 归一化、暂存条目与远端词表 payload 的规范化逻辑。 |
| [runtime.mjs](runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildPublishedVocabularyPayload | 函数 | 92–120 | 将本地受控词表序列化为符合远端词表 schema 的 payload，并归一化标签与父级绑定。 |
| fetchJsonOrThrow | 函数 | 48–64 | 发起 JSON 请求并把非 2xx 响应与解析失败统一转成带状态码的错误。 |
| fetchPublishBaseline | 函数 | 66–90 | 拉取远端已发布词表文件的 base64 内容与提交 SHA，作为并发发布比对基线。 |
| publishRemoteVocabulary | 函数 | 145–230 | 编排完整的发布流程：读取基线、比较差异、写入受控与暂存分区，并返回发布结果与诊断信息。 |
| putPublishedVocabulary | 函数 | 122–143 | 以期望 SHA 乐观锁方式把词表 payload 写回 GitHub Contents API，冲突时抛出可重试信号。 |
| subscribeRemoteVocabulary | 函数 | 232–276 | 按轮询间隔拉取远端词表并比较指纹，检测到外部更新时触发回调并刷新本地快照。 |
