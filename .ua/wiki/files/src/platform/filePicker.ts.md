
# src/platform/filePicker.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/platform](../../../modules/src/platform.md)
<!-- node: file:src/platform/filePicker.ts -->

跨运行时文件选择器：优先使用宿主提供的原生多选文件对话框，在不可用时回退到 toolkit 的 FilePicker，并负责挑选可用的 parent window。
源码：[src/platform/filePicker.ts](../../../../../src/platform/filePicker.ts)

## 符号（3）
<!-- node: function:src/platform/filePicker.ts:isUsableRuntimeFilePickerParentWindow -->
<!-- node: function:src/platform/filePicker.ts:openNativeMultiFilePicker -->
<!-- node: function:src/platform/filePicker.ts:openRuntimeFilePicker -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| isUsableRuntimeFilePickerParentWindow | 函数 | 18–30 | 简单 | validation、window、platform | 0 | 判定候选窗口是否适合作为文件选择器 parent，要求未关闭且存在 browsingContext。 |
| openNativeMultiFilePicker | 函数 | 38–102 | 中等 | file-picker、platform、conversion | 0 | 调用宿主原生多选文件对话框，并在返回时把 nsIFile 结果转成 File 列表。 |
| openRuntimeFilePicker | 函数 | 104–142 | 简单 | file-picker、fallback、platform、exported | 0 | 统一的文件选择入口：优先原生对话框，不可用时回退到 toolkit FilePicker。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtimeBridge.ts](../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunInteractionFiles.ts](../modules/acp/skillRun/acpSkillRunInteractionFiles.ts.md) | src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts | Skill 运行交互文件管理：把用户交互请求/响应、附件与文件选择投影到 runtime 文件与 assistant 交互契约之间。 |
| [dashboardActions.ts](../modules/dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [file.ts](../workflows/file.ts.md) | src/workflows/file.ts | 工作流文件能力 API：基于 runtimePersistence 统一的文件读写、原子写入、目录遍历与移动删除，并接入平台文件选择器，路径与错误均按 Workflow Host 契约规范化。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| openRuntimeFilePicker | 函数 | 104–142 | 统一的文件选择入口：优先原生对话框，不可用时回退到 toolkit FilePicker。 |
