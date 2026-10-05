
# src/sidebar/assistantWorkspaceAcpChild.js
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/sidebar](../../../modules/src/sidebar.md)
<!-- node: file:src/sidebar/assistantWorkspaceAcpChild.js -->

Assistant Workspace ACP 子运行时：校验宿主 wire 契约与 publication envelope，维护 owner（backend/conversation 与 requestId）分页读取、transcript 快照与面板 action 路由。
源码：[src/sidebar/assistantWorkspaceAcpChild.js](../../../../../src/sidebar/assistantWorkspaceAcpChild.js)

## 符号（15）
<!-- node: function:src/sidebar/assistantWorkspaceAcpChild.js:applyOwnerNavigationUiTransition -->
<!-- node: function:src/sidebar/assistantWorkspaceAcpChild.js:boot -->
<!-- node: function:src/sidebar/assistantWorkspaceAcpChild.js:canonicalActionOwner -->
<!-- node: function:src/sidebar/assistantWorkspaceAcpChild.js:commitMutationBatch -->
<!-- node: function:src/sidebar/assistantWorkspaceAcpChild.js:createAssistantWorkspaceAcpChildRuntime -->
<!-- node: function:src/sidebar/assistantWorkspaceAcpChild.js:createClient -->
<!-- node: function:src/sidebar/assistantWorkspaceAcpChild.js:createController -->
<!-- node: function:src/sidebar/assistantWorkspaceAcpChild.js:createPageRequest -->
<!-- node: function:src/sidebar/assistantWorkspaceAcpChild.js:createReceiver -->
<!-- node: function:src/sidebar/assistantWorkspaceAcpChild.js:planMutationBatch -->
<!-- node: function:src/sidebar/assistantWorkspaceAcpChild.js:readStateRegion -->
<!-- node: function:src/sidebar/assistantWorkspaceAcpChild.js:resolvePanelActionEnvelope -->
<!-- node: function:src/sidebar/assistantWorkspaceAcpChild.js:validatePageMetadata -->
<!-- node: function:src/sidebar/assistantWorkspaceAcpChild.js:validPublicationEnvelope -->
<!-- node: function:src/sidebar/assistantWorkspaceAcpChild.js:validPublicationPayload -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyOwnerNavigationUiTransition | 函数 | 1066–1075 | 简单 | owner-switch、loading-state、transcript、ux | 1 | owner 切换时先发布新 owner 的 loading-first 空快照，保证首屏不被旧 owner 阻塞。 |
| boot | 函数 | 1872–1879 | 简单 | entry-point、bootstrap、acp、lifecycle | 0 | 引导 ACP 子运行时，绑定宿主 bridge 键并启动初始 owner 加载。 |
| canonicalActionOwner | 函数 | 1032–1064 | 中等 | ownership、validation、assistant-workspace、guard | 1 | 判定面板动作的规范 owner，防止跨 owner 误操作或陈旧动作落地。 |
| commitMutationBatch | 函数 | 546–589 | 中等 | mutation、transaction、broker、commit | 1 | 提交已规划的 mutation 批次，按 durable insert winner 语义决定谁真正执行。 |
| [createAssistantWorkspaceAcpChildRuntime](../../../symbols/src/sidebar/assistantWorkspaceAcpChild.js/createAssistantWorkspaceAcpChildRuntime.md) | 函数 | 1142–1870 | 复杂 | entry-point、runtime、assistant-workspace、orchestration、transcript | 1 | ACP 子运行时装配入口：管理 owner 生命周期、分页读取调度、transcript 快照发布与区域渲染协调。 |
| createClient | 函数 | 886–987 | 中等 | client、rpc、acp、assistant-workspace | 1 | 封装与宿主之间的出站调用：面板动作发送、transcript 读取与 owner 切换请求。 |
| createController | 函数 | 989–1008 | 简单 | controller、orchestration、assistant-workspace、factory | 1 | 创建控制层，串联接收器、客户端与区域渲染协调器。 |
| [createPageRequest](../../../symbols/src/sidebar/assistantWorkspaceAcpChild.js/createPageRequest.md) | 函数 | 359–416 | 中等 | pagination、transcript、request、assistant-workspace | 2 | 构造 transcript 分页读取请求，绑定 owner 键、页码与 cursor。 |
| [createReceiver](../../../symbols/src/sidebar/assistantWorkspaceAcpChild.js/createReceiver.md) | 函数 | 591–884 | 复杂 | event-handler、wire-contract、dispatch、acp | 1 | 创建宿主消息接收器：分类 shell bridge 与 ACP child 消息，完成 wire 校验后分派到运行时状态。 |
| [planMutationBatch](../../../symbols/src/sidebar/assistantWorkspaceAcpChild.js/planMutationBatch.md) | 函数 | 469–544 | 复杂 | mutation、batching、validation、broker | 1 | 把一批宿主 mutation 归并为有序计划，逐项检查身份与 revision 前置条件。 |
| readStateRegion | 函数 | 303–323 | 简单 | accessor、panel-dto、assistant-workspace、utility | 0 | 按区域名读取面板 DTO 中的状态片段，缺省时返回空投影。 |
| resolvePanelActionEnvelope | 函数 | 1077–1140 | 中等 | action-dispatch、wire-contract、validation、security | 1 | 把 UI 动作解析为宿主 wire envelope，拒绝不在白名单内的控制动作。 |
| validatePageMetadata | 函数 | 435–463 | 中等 | validation、pagination、basis-check、transcript | 1 | 校验分页元数据的序号连续性与 basis 一致性，不一致时使整次读取失败。 |
| [validPublicationEnvelope](../../../symbols/src/sidebar/assistantWorkspaceAcpChild.js/validPublicationEnvelope.md) | 函数 | 178–247 | 复杂 | validation、wire-contract、envelope、acp | 1 | 校验 publication envelope：schema 版本、shell bridge 键与内层 payload 形状。 |
| [validPublicationPayload](../../../symbols/src/sidebar/assistantWorkspaceAcpChild.js/validPublicationPayload.md) | 函数 | 89–176 | 复杂 | validation、wire-contract、security、acp | 1 | 按共享契约校验 publication payload 的字段集合，剔除禁止字段并拒绝未知键。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantInteractionContract.ts](../shared/assistantInteractionContract.ts.md) | src/shared/assistantInteractionContract.ts | Assistant 待用户交互（permission / choice / 文件上传）的跨边界合约：定义选项数、文件数与字节上限，以及归一化、投影、解析与确定性响应文案生成的唯一实现。 |
| [assistantPanelModel.js](assistantPanelModel.js.md) | src/sidebar/assistantPanelModel.js | Assistant Workspace 面板的纯投影模型：把工作区 snapshot 归一化为面板 DTO，包含状态/应用态语义、精确工作区字段、任务与分组、抽屉区块与空态 chrome。 |
| [assistantPanelRenderer.js](assistantPanelRenderer.js.md) | src/sidebar/assistantPanelRenderer.js | 面板 chrome 的命令式 DOM 渲染器：管理 toolbar/banner/plan 等托管挂载点、区域标记与 overlay 关闭，并向宿主派发面板 action。 |
| [assistantRegionCollapse.ts](assistantRegionCollapse.ts.md) | src/sidebar/assistantRegionCollapse.ts | Assistant Workspace 区域折叠控制器：按区域可见性自动决定折叠阶段，并维护用户覆盖态，折叠只切换容器 class 与 data 属性。 |
| [assistantTranscriptRenderer.js](assistantTranscriptRenderer.js.md) | src/sidebar/assistantTranscriptRenderer.js | Transcript 区域的命令式渲染器：虚拟滚动窗口、分页缓存与 anchor 保持、工具调用活动分组、代码块装饰及底部粘滞逻辑都在此实现。 |
| [assistantWireContract.ts](../shared/assistantWireContract.ts.md) | src/shared/assistantWireContract.ts | Assistant Workspace / SkillRunner 侧边栏的跨进程 wire 合约：快照 schema 版本、禁止上线的内部字段清单、publication envelope 与 transcript/delta/permission 键集合、消息类型与 shell/child 动作词表。 |
| [chromeRenderer.ts](components/chromeRenderer.ts.md) | src/sidebar/components/chromeRenderer.ts | Workspace chrome 渲染协调器：按区域 signature 差异驱动各 Preact managed region 渲染，并把 transcript 容器交给命令式渲染器。 |
| [markdownParser.js](markdownParser.js.md) | src/sidebar/markdownParser.js | 侧边栏 Markdown 渲染入口：懒加载共享 markdown parser 并按 document profile 渲染消息正文。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChildApp.js](acpChildApp.js.md) | src/sidebar/acpChildApp.js | ACP 子应用页面的单行 esbuild 入口，只负责从 assistantWorkspaceAcpChild 引入并引导子运行时启动。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyOwnerNavigationUiTransition | 函数 | 1066–1075 | owner 切换时先发布新 owner 的 loading-first 空快照，保证首屏不被旧 owner 阻塞。 |
| boot | 函数 | 1872–1879 | 引导 ACP 子运行时，绑定宿主 bridge 键并启动初始 owner 加载。 |
| [createAssistantWorkspaceAcpChildRuntime](../../../symbols/src/sidebar/assistantWorkspaceAcpChild.js/createAssistantWorkspaceAcpChildRuntime.md) | 函数 | 1142–1870 | ACP 子运行时装配入口：管理 owner 生命周期、分页读取调度、transcript 快照发布与区域渲染协调。 |
| createClient | 函数 | 886–987 | 封装与宿主之间的出站调用：面板动作发送、transcript 读取与 owner 切换请求。 |
| createController | 函数 | 989–1008 | 创建控制层，串联接收器、客户端与区域渲染协调器。 |
| [createPageRequest](../../../symbols/src/sidebar/assistantWorkspaceAcpChild.js/createPageRequest.md) | 函数 | 359–416 | 构造 transcript 分页读取请求，绑定 owner 键、页码与 cursor。 |
| resolvePanelActionEnvelope | 函数 | 1077–1140 | 把 UI 动作解析为宿主 wire envelope，拒绝不在白名单内的控制动作。 |
