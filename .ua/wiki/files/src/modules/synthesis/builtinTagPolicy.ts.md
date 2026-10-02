
# src/modules/synthesis/builtinTagPolicy.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis](../../../../modules/src/modules/synthesis.md)
<!-- node: file:src/modules/synthesis/builtinTagPolicy.ts -->

Synthesis 内置状态标签策略的 SSOT：定义 status facet 的固定标签集合、可变/不可变字段，并在词表保存与协议写回时强制保护这些内置语义不被用户覆盖。
源码：[src/modules/synthesis/builtinTagPolicy.ts](../../../../../../src/modules/synthesis/builtinTagPolicy.ts)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisWorkbenchTab.ts](workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
| [types.ts](../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [uiModel.ts](uiModel.ts.md) | src/modules/synthesis/uiModel.ts | Synthesis 工作台的 UI 状态模型：把 workbench 契约快照规范化为可渲染的行集合，实现 topic / concept / tag / graph / review / registry 各面板的筛选与派生逻辑，并用纯函数 reducer 处理全部工作台 action。 |
| [zoteroHostCapabilityBroker.ts](../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createBuiltinStatusVocabularyEntry](../../../../symbols/globals.md) | 函数 | 85–98 | 由内置状态策略生成只读的词表条目，标记为不可删除、不可改名的系统标签。 |
| [getBuiltinStatusPolicy](../../../../symbols/globals.md) | 函数 | 77–83 | 按 status key 查找内置状态策略条目，未知 key 返回 undefined。 |
| [hasInitializedBuiltinTagPolicy](../../../../symbols/globals.md) | 函数 | 142–159 | 在插件启动路径中幂等地确保内置标签策略已初始化，并返回本次是否真正执行了初始化。 |
| [protectBuiltinStatusProtocol](../../../../symbols/globals.md) | 函数 | 130–140 | 在标签写回协议载荷前强制恢复内置状态标签的规范形式，避免 UI 状态被非标准值污染。 |
| [protectBuiltinTagVocabularyEntries](../../../../symbols/globals.md) | 函数 | 100–128 | 在用户词表合并前重新注入内置状态条目，并剔除用户提交中对内置标签的非法字段修改。 |
