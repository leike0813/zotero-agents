
# src/modules/acp/skillRun/acpSkillReferenceRewriter.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillReferenceRewriter.ts -->

Skill 内容引用重写器：把 SKILL.md 等文本中的相对引用改写为物化后的绝对路径，无外部依赖。
源码：[src/modules/acp/skillRun/acpSkillReferenceRewriter.ts](../../../../../../../src/modules/acp/skillRun/acpSkillReferenceRewriter.ts)

## 符号（2）
<!-- node: function:src/modules/acp/skillRun/acpSkillReferenceRewriter.ts:insertAcpSkillProxyPatchBlock -->
<!-- node: function:src/modules/acp/skillRun/acpSkillReferenceRewriter.ts:rewriteAcpSkillReferences -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| insertAcpSkillProxyPatchBlock | 函数 | 136–159 | 中等 | acp、skill-patch、text-transform | 0 | 在 Skill 文档尾部插入薄代理 patch 块，声明运行期注入的约束与可用工具。 |
| rewriteAcpSkillReferences | 函数 | 99–134 | 中等 | acp、skill、path-rewrite、text-transform | 0 | 重写 SKILL.md 等文本中的相对资源与 Skill 前缀引用为物化后的绝对便携路径。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpThinProxySkillMaterializer.ts](acpThinProxySkillMaterializer.ts.md) | src/modules/acp/skillRun/acpThinProxySkillMaterializer.ts | ACP Skill 的薄代理物化器：按 agent family 解析 skill 根目录，注入 patch 模板与参考重写，把 Skill 包物化成 Agent 可直接消费的目录结构。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| insertAcpSkillProxyPatchBlock | 函数 | 136–159 | 在 Skill 文档尾部插入薄代理 patch 块，声明运行期注入的约束与可用工具。 |
| rewriteAcpSkillReferences | 函数 | 99–134 | 重写 SKILL.md 等文本中的相对资源与 Skill 前缀引用为物化后的绝对便携路径。 |
