
# src/modules/acp/skillRun/acpSkillPatchTemplates.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillPatchTemplates.ts -->

Skill Patch 模板模块：把内置 patch 模板物化到 runtime 目录，供不同 agent family 修补 SKILL.md 行为差异。
源码：[src/modules/acp/skillRun/acpSkillPatchTemplates.ts](../../../../../../../src/modules/acp/skillRun/acpSkillPatchTemplates.ts)

## 符号（2）
<!-- node: function:src/modules/acp/skillRun/acpSkillPatchTemplates.ts:loadAcpSkillPatchTemplate -->
<!-- node: function:src/modules/acp/skillRun/acpSkillPatchTemplates.ts:renderAcpSkillPatchTemplate -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| loadAcpSkillPatchTemplate | 函数 | 121–136 | 简单 | acp、skill-patch、template、loader | 0 | 按模块 id 加载 ACP Skill patch 模板，兼容 Chrome 资源与 Node 读取两条路径。 |
| renderAcpSkillPatchTemplate | 函数 | 138–162 | 中等 | acp、skill-patch、template、renderer | 0 | 渲染 Skill patch 模板内容，把运行上下文占位符替换为实际值。 |

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
| [acpSkillRunPromptBuilder.ts](acpSkillRunPromptBuilder.ts.md) | src/modules/acp/skillRun/acpSkillRunPromptBuilder.ts | Skill run prompt 构建器：组合 agent family 规则、共享 Skill 目录、patch 模板与工作区上下文，生成最终运行提示词。 |
| [acpThinProxySkillMaterializer.ts](acpThinProxySkillMaterializer.ts.md) | src/modules/acp/skillRun/acpThinProxySkillMaterializer.ts | ACP Skill 的薄代理物化器：按 agent family 解析 skill 根目录，注入 patch 模板与参考重写，把 Skill 包物化成 Agent 可直接消费的目录结构。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| loadAcpSkillPatchTemplate | 函数 | 121–136 | 按模块 id 加载 ACP Skill patch 模板，兼容 Chrome 资源与 Node 读取两条路径。 |
| renderAcpSkillPatchTemplate | 函数 | 138–162 | 渲染 Skill patch 模板内容，把运行上下文占位符替换为实际值。 |
