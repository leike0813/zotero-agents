
# contracts/host-bridge/surfaces.json
所属分层：[Zotero 宿主与 Bridge 集成](../../../layers/zotero-host.md)  
所属目录：[contracts/host-bridge](../../../modules/contracts/host-bridge.md)
<!-- node: config:contracts/host-bridge/surfaces.json -->

Host Bridge 面向代理的 surface 清单，列出 MCP、CLI 与插件内置 skill 包三类 surface 及其发布身份。是判断某个能力从哪条代理通道暴露、以及 CLI 发布版本的权威配置。
源码：[contracts/host-bridge/surfaces.json](../../../../../contracts/host-bridge/surfaces.json)
<!-- node: service:contracts/host-bridge/surfaces.json:zotero-bridge-cli -->

最小核心 agent-facing surface：把 Host Bridge CLI 自身作为一个 skill 挂载出来（sourceRoot 为 skills_src/zotero-bridge-cli），是其它 surface 的基座，patch 号决定内置技能包内容版本。
源码：[contracts/host-bridge/surfaces.json](../../../../../contracts/host-bridge/surfaces.json)
<!-- node: service:contracts/host-bridge/surfaces.json:zotero-librarian -->

Hermes facet 下的 hosted-agent surface，extends zotero-library-agent，以 Hermes Profile 形式发布 zotero-librarian skill，落到 profiles/hermes/zotero-librarian，是 Profile 发布链路的终端 surface。
源码：[contracts/host-bridge/surfaces.json](../../../../../contracts/host-bridge/surfaces.json)
<!-- node: service:contracts/host-bridge/surfaces.json:zotero-library-agent -->

通用代理 surface，extends zotero-bridge-cli，额外挂载 library-agent 与 library-query、literature-acquisition、literature-analysis、research-synthesis、library-curation 六个 skill，覆盖文献获取到综合的完整链路。
源码：[contracts/host-bridge/surfaces.json](../../../../../contracts/host-bridge/surfaces.json)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgePluginSkillBundle.ts](../../src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts.md) | src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts | 构建随插件分发的 Host Bridge agent skill 包：以 contracts/host-bridge/surfaces.json 为事实源生成 skill 内容，并用 SHA-256 摘要判断是否需要重新物化。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| zotero-bridge-cli | contracts/host-bridge/surfaces.json | 最小核心 agent-facing surface：把 Host Bridge CLI 自身作为一个 skill 挂载出来（sourceRoot 为 skills_src/zotero-bridge-cli），是其它 surface 的基座，patch 号决定内置技能包内容版本。 |
| zotero-library-agent | contracts/host-bridge/surfaces.json | 通用代理 surface，extends zotero-bridge-cli，额外挂载 library-agent 与 library-query、literature-acquisition、literature-analysis、research-synthesis、library-curation 六个 skill，覆盖文献获取到综合的完整链路。 |

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgePluginSkillBundle.ts](../../src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts.md) | src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts | 构建随插件分发的 Host Bridge agent skill 包：以 contracts/host-bridge/surfaces.json 为事实源生成 skill 内容，并用 SHA-256 摘要判断是否需要重新物化。 |
