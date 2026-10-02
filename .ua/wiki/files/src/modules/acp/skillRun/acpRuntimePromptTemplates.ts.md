
# src/modules/acp/skillRun/acpRuntimePromptTemplates.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpRuntimePromptTemplates.ts -->

ACP 运行时 prompt 模板管理：把内置 prompt 模板物化到 runtime 目录并提供按 key 读取/解析的能力。
源码：[src/modules/acp/skillRun/acpRuntimePromptTemplates.ts](../../../../../../../src/modules/acp/skillRun/acpRuntimePromptTemplates.ts)

## 符号（2）
<!-- node: function:src/modules/acp/skillRun/acpRuntimePromptTemplates.ts:loadAcpRuntimePromptTemplate -->
<!-- node: function:src/modules/acp/skillRun/acpRuntimePromptTemplates.ts:renderAcpRuntimePromptTemplate -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| loadAcpRuntimePromptTemplate | 函数 | 101–116 | 简单 | acp、prompt、template、loader | 0 | 按模板 id 加载 ACP 运行时 prompt 模板内容，优先从 runtime 物化目录读取。 |
| renderAcpRuntimePromptTemplate | 函数 | 118–142 | 中等 | acp、prompt、template、renderer | 0 | 渲染运行时 prompt 模板，替换后端、路径与 Skill 上下文占位符。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [package.json](../../../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimeBridge.ts](../../../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatSkillInjection.ts](../chat/acpChatSkillInjection.ts.md) | src/modules/acp/chat/acpChatSkillInjection.ts | ACP Chat 的 Skill 注入层：把 Host Bridge CLI 注入能力与可共享 Skill 目录组装成会话级 prompt 片段，并按 agent family 定制注入策略。 |
| [acpSkillRunExecutionSupport.ts](acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [acpSkillRunInteractionFiles.ts](acpSkillRunInteractionFiles.ts.md) | src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts | Skill 运行交互文件管理：把用户交互请求/响应、附件与文件选择投影到 runtime 文件与 assistant 交互契约之间。 |
| [acpSkillRunRecovery.ts](acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [acpStartupPromptPreambles.ts](acpStartupPromptPreambles.ts.md) | src/modules/acp/skillRun/acpStartupPromptPreambles.ts | ACP 会话启动提示前缀：解析内置指令文件并把宿主环境说明以可读前言形式插入首轮 prompt。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| loadAcpRuntimePromptTemplate | 函数 | 101–116 | 按模板 id 加载 ACP 运行时 prompt 模板内容，优先从 runtime 物化目录读取。 |
| renderAcpRuntimePromptTemplate | 函数 | 118–142 | 渲染运行时 prompt 模板，替换后端、路径与 Skill 上下文占位符。 |
