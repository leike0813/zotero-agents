
# src/modules/synthesis
> 目录聚合页：23 个文件、69 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/synthesis/builtinTagPolicy.ts](../../../files/src/modules/synthesis/builtinTagPolicy.ts.md) | 文件 | 0 | Synthesis 内置状态标签策略的 SSOT：定义 status facet 的固定标签集合、可变/不可变字段，并在词表保存与协议写回时强制保护这些内置语义不被用户覆盖。 |
| [src/modules/synthesis/citationGraph.ts](../../../files/src/modules/synthesis/citationGraph.ts.md) | 文件 | 5 | Citation Graph 投影层：把文献与引用输入归一为稳定 reference key，去重合并 canonical paper 后调用 synthesis-engine 计算统一引用图谱。 |
| [src/modules/synthesis/digestRepresentativeImage.ts](../../../files/src/modules/synthesis/digestRepresentativeImage.ts.md) | 文件 | 2 | 从 digest managed note 的 HTML 中解析代表图描述符，并投影成 UI 所需的精简字段。 |
| [src/modules/synthesis/exportDeliveryAdapter.ts](../../../files/src/modules/synthesis/exportDeliveryAdapter.ts.md) | 文件 | 1 | Synthesis 宿主导出与运行工作区物化 port 的实现：把 sidecar 侧请求落到运行时目录、注册 Host Bridge 文件句柄并返回可下载交付结果。 |
| [src/modules/synthesis/foundation.ts](../../../files/src/modules/synthesis/foundation.ts.md) | 文件 | 5 | Synthesis 层基础设施：统一 canonical JSON 序列化与哈希、topic 路径 id 生成，以及知识图谱与 topic 存储目录布局。 |
| [src/modules/synthesis/itemObserver.ts](../../../files/src/modules/synthesis/itemObserver.ts.md) | 文件 | 2 | 监听 Zotero 条目与子笔记变更，识别文献评分等 managed note 变更并发出 Synthesis 读模型失效通知。 |
| [src/modules/synthesis/libraryAdapter.ts](../../../files/src/modules/synthesis/libraryAdapter.ts.md) | 文件 | 12 | Synthesis 侧 Zotero 读端适配器：把 Broker 与分页查询得到的库条目投影为契约要求的 host read port，产出文献摘要、引用图输入与产物描述符。 |
| [src/modules/synthesis/registry.ts](../../../files/src/modules/synthesis/registry.ts.md) | 文件 | 8 | 文献 sidecar 注册表：归一文献元数据指纹、发现 managed note 中的产物覆盖情况，并生成 sidecar 索引行与分面统计。 |
| [src/modules/synthesis/relatedItemsEffectAdapter.ts](../../../files/src/modules/synthesis/relatedItemsEffectAdapter.ts.md) | 文件 | 2 | Synthesis related-items effect port 实现：依据 portable ref 解析 Zotero 条目并以追加方式写入关联关系，缺失条目转为诊断信息。 |
| [src/modules/synthesis/representativeImageReadAdapter.ts](../../../files/src/modules/synthesis/representativeImageReadAdapter.ts.md) | 文件 | 1 | Synthesis 代表图读取 port 实现：按 digest 描述符定位附件文件、读取字节并以 base64 形式回传，同时对不可用情形返回结构化诊断。 |
| [src/modules/synthesis/reviewInput.ts](../../../files/src/modules/synthesis/reviewInput.ts.md) | 文件 | 4 | 构建概念审阅工作流输入：归一已解析论文与注册表行，裁剪出审阅所需的引用图谱切片并汇总缺失产物诊断。 |
| [src/modules/synthesis/runWorkspaceMaterializationAdapter.ts](../../../files/src/modules/synthesis/runWorkspaceMaterializationAdapter.ts.md) | 文件 | 2 | 把 synthesis-contracts 定义的 run workspace 物化契约适配到插件侧运行时文件系统，使 Sidecar 下发的 workspace 结构在 Zotero 沙箱内按 runtimePersistence 规则落盘。 |
| [src/modules/synthesis/syncRecovery.ts](../../../files/src/modules/synthesis/syncRecovery.ts.md) | 文件 | 4 | Synthesis 侧同步恢复逻辑，负责在 sidecar 交互中断后重建同步状态并驱动重试与补偿流程。 |
| [src/modules/synthesis/syncRuntimeCleanup.ts](../../../files/src/modules/synthesis/syncRuntimeCleanup.ts.md) | 文件 | 2 | Synthesis 同步运行期残留的清理入口：在 sidecar 生命周期结束或首选项关闭后清掉旧的同步临时目录，避免磁盘堆积。 |
| [src/modules/synthesis/tagEffectAdapter.ts](../../../files/src/modules/synthesis/tagEffectAdapter.ts.md) | 文件 | 2 | Synthesis 标签 effect port 实现：经 Broker 写入受审批的标签绑定，并支持 staged tag binding 的解析与迁移。 |
| [src/modules/synthesis/uiModel.ts](../../../files/src/modules/synthesis/uiModel.ts.md) | 文件 | 0 | Synthesis 工作台的 UI 状态模型：把 workbench 契约快照规范化为可渲染的行集合，实现 topic / concept / tag / graph / review / registry 各面板的筛选与派生逻辑，并用纯函数 reducer 处理全部工作台 action。 |
| [src/modules/synthesis/webDavSyncAdapter.ts](../../../files/src/modules/synthesis/webDavSyncAdapter.ts.md) | 文件 | 3 | WebDAV 同步 port 实现：从插件首选项读取连接配置，经 HTTP client 发起 PROPFIND/PUT/MKCOL 请求并重建契约化的读写结果与远端描述。 |
| [src/modules/synthesis/webDavSyncClient.ts](../../../files/src/modules/synthesis/webDavSyncClient.ts.md) | 文件 | 3 | WebDAV 同步的默认 HTTP client：基于 Zotero 运行时能力发起请求、解析响应头，并为请求附加凭据。 |
| [src/modules/synthesis/webDavSyncCredentialPrefs.ts](../../../files/src/modules/synthesis/webDavSyncCredentialPrefs.ts.md) | 文件 | 2 | WebDAV 凭据的加密存取：基于插件主密钥派生密钥对凭据做加密后写入首选项，读取时解密并做基本校验。 |
| [src/modules/synthesis/webDavSyncPrefs.ts](../../../files/src/modules/synthesis/webDavSyncPrefs.ts.md) | 文件 | 5 | WebDAV 同步首选项的配置读写与状态投影：校验配置、暴露配置状态、执行连接测试并统一生成诊断信息。 |
| [src/modules/synthesis/webDavSyncRemote.ts](../../../files/src/modules/synthesis/webDavSyncRemote.ts.md) | 文件 | 2 | WebDAV 远端地址的清洗与拼接：抹除 URL 中的凭据并把 base URL 与相对路径组合成可请求地址。 |
| [src/modules/synthesis/webDavSyncTypes.ts](../../../files/src/modules/synthesis/webDavSyncTypes.ts.md) | 文件 | 0 | WebDAV 同步的插件侧类型出口：把 synthesis-contracts 中的配置状态与诊断类型重新导出，并定义连接测试结果 DTO，避免 UI 层直接依赖合约包路径。 |
| [src/modules/synthesis/zoteroItemRefAdapter.ts](../../../files/src/modules/synthesis/zoteroItemRefAdapter.ts.md) | 文件 | 2 | portable item ref 与 Zotero 实体之间的双向适配：按 ref 查找条目并从条目生成稳定 ref。 |

## 子目录
- [debug](synthesis/debug.md)、[production](synthesis/production.md)、[reverseHost](synthesis/reverseHost.md)、[sidecar](synthesis/sidecar.md)、[workbench](synthesis/workbench.md)

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [packages/synthesis-contracts/src](../../packages/synthesis-contracts/src.md) | 16 |
| [src/utils](../utils.md) | 10 |
| [src/modules](../modules.md) | 9 |
| [src/shared](../shared.md) | 4 |
| [packages/synthesis-engine/src](../../packages/synthesis-engine/src.md) | 3 |
| [src/modules/zoteroHost](zoteroHost.md) | 3 |
| [src/modules/hostBridge/server](hostBridge/server.md) | 2 |
| [src/workflows](../workflows.md) | 2 |
| [packages/synthesis-application/src](../../packages/synthesis-application/src.md) | 1 |
| [src/modules/synthesisClient](synthesisClient.md) | 1 |
