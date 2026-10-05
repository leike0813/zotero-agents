
# SkillRunnerProvider
<!-- node: class:src/providers/skillrunner/provider.ts:SkillRunnerProvider -->

SkillRunner Provider 实现：校验后端协议兼容性、解析管理认证、按请求种类分派到 client，并声明模型、effort、缓存与超时等运行时选项 schema。
类型：类  
复杂度：复杂  
入边数：1  
标签：provider、skillrunner、backend-adapter、orchestration  
所属文件：[src/providers/skillrunner/provider.ts](../../../../../files/src/providers/skillrunner/provider.ts.md)
源码：[src/providers/skillrunner/provider.ts:109](../../../../../../../src/providers/skillrunner/provider.ts#L109)

## 语言要点

staticClient 让纯协议校验路径可复用已构造 client，测试无需真实网络即可覆盖 supports 与 options 分支。

## 被调用

没有节点记录了对它的调用。

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [assertSkillRunnerBackendSupportsProtocol](../../../../../files/src/modules/skillRunner/connection/skillRunnerHandshake.ts.md) | src/modules/skillRunner/connection/skillRunnerHandshake.ts:95–117 | 断言后端支持执行所需的协议，缺失时抛出明确错误，避免把不兼容请求发给旧版后端。 |
| [normalizeSkillRunnerModel](../../../../../files/src/providers/skillrunner/modelCatalog.ts.md) | src/providers/skillrunner/modelCatalog.ts:721–744 | SkillRunner 模型规格归一入口，自动补全 provider 前缀并校验 effort 合法性。 |
