# 检索契约样例审阅

本材料属于[验证检索契约样例与验收证据是否足够](https://github.com/leike0813/zotero-agents/issues/86)，更新日期为 2026-10-07。审阅状态：**四组实际任务样例已接受，决议已发布**，以[最终结论](https://github.com/leike0813/zotero-agents/issues/86#issuecomment-6020755011)为准。

用户认为状态调试面板难以理解，讨论改为逐个实际任务与自然语言返回样例。[首个实际反馈](https://github.com/leike0813/zotero-agents/issues/86#issuecomment-6020620945)接受推荐列表的“标题＋材料来源＋短摘录”，认为足以决定是否打开论文；只有标题时明确依据有限。HTML 不作为已接受的产品界面，后续按任务讨论 Agent 证据与工作流选材，不重新征求已确认政策。

[第二个实际反馈](https://github.com/leike0813/zotero-agents/issues/86#issuecomment-6020652409)接受“论文身份＋完整原文摘录＋来源位置入口＋返回时已核验正文版本”的证据返回样例，认为足以核查并引用；无法核验的片段跳过并说明，其他成功核验证据仍可返回。这是虚构任务样例的使用反馈，不是实际召回质量证明。

[第三个实际反馈](https://github.com/leike0813/zotero-agents/issues/86#issuecomment-6020680741)接受工作流的“指定集合＋最多100篇＋实际选中名单＋后续只处理锁定名单”任务样例。获取本轮名单时翻页失败或依据变化须停止依赖它的后续分析，不交付残缺集合；这不将所有 limited 结果统一判为不可消费。

第四个实际反馈接受 Topic Discovery 的待审候选展示与采纳流程：来源与短摘录可查，只有标题标明材料不足；候选可拒绝或交现有 Topic Update 审阅，仅成功采纳后成为 Topic 来源，明确拒绝不因后台刷新重新出现。用户确认能区分候选与已采用来源，反馈记录在最终结论中。

打开同目录的 [单文件演示](issue86-contract-prototype.html)，选择场景并按编号点击。每次选择场景均重置内存状态；自由操作位于页面底部。无需安装依赖或启动服务器。

演示问题是：既定契约是否足以表达 Agent 的当前证据、工作流的完整有界选材，以及 Synthesis 的推荐材料、候选范围与用户审阅意图？这里没有生产 UI 提案，不修改已有界面或公共接口。

## 样例与决议的对应关系

| 场景 | 应审阅的可观察行为 | 决议依据 |
| --- | --- | --- |
| 证据回读 | 返回完整来源片段、版本与 UTF-16 范围；确认变化或删除后不返回旧正文；核验受限零条区别于正常零命中 | [查询契约](https://github.com/leike0813/zotero-agents/issues/83#issuecomment-6019183704)、[来源变化政策](https://github.com/leike0813/zotero-agents/issues/82#issuecomment-5980181939) |
| 工作流分页 | 有界轮次、total 未知、续页依据失效、完整获取后锁定；maxResults 与内部预算不足分开；明确空集合、双库同 key 身份与 Topic 聚合 | [查询契约](https://github.com/leike0813/zotero-agents/issues/83#issuecomment-6019183704)、[消费边界](https://github.com/leike0813/zotero-agents/issues/85#issuecomment-6020179791) |
| 推荐材料 | 元数据摘要、已有生成概述、仅标题弱依据明确区分；排除自身、限定参照论文所在库；能力不可用时保留同 owner 旧内容，词法不冒充相似推荐 | [材料与推荐决议](https://github.com/leike0813/zotero-agents/issues/85#issuecomment-6020179791) |
| 审阅与采纳 | 必需／排除条件按预设语义审阅；材料不足待审；失败 apply 不提交采纳，成功后提交；screened_out 仅依据变化时重评 | [Discovery 决议](https://github.com/leike0813/zotero-agents/issues/85#issuecomment-6020179791) |
| 拒绝与迟到结果 | 计算期间拒绝、提交时复核；显式恢复；没有有效 Topic 描述时保留候选，不生成兴趣或以综合结论代替 | [提交核验](https://github.com/leike0813/zotero-agents/issues/82#issuecomment-5980649295)、[消费边界](https://github.com/leike0813/zotero-agents/issues/85#issuecomment-6020179791) |
| 范围与发布 | 待生效双库范围不提前参与；模型／范围／索引整体发布；Discovery 显式跨库，相似推荐仍限参照库；清理与候选失败不撤销索引 | [范围与发布](https://github.com/leike0813/zotero-agents/issues/82#issuecomment-5980714524)、[库范围](https://github.com/leike0813/zotero-agents/issues/85#issuecomment-6020179791) |
| 取消与重启 | 取消请求与终态分开，迟到发布被拒；保留有效批次；运行中重启失败，不自动执行；用户重试后完成整体发布 | [生命周期](https://github.com/leike0813/zotero-agents/issues/82#issuecomment-5980714524) |
| 未执行与部分失败 | 未执行任务重启后待继续；应有材料读取失败阻止发布，本来没有 digest 不要求生成；就绪索引重启仍可用，同模型兼容服务切换免重建 | [生命周期](https://github.com/leike0813/zotero-agents/issues/82#issuecomment-5980714524)、[provider 决议](https://github.com/leike0813/zotero-agents/issues/81#issuecomment-5979998325) |

## 如何解读演示

- 五篇论文、双库身份、标题、正文、摘要类别、候选顺序及 triage 结论均为合成预设。中英文标题与查询只帮助检查语言和来源表达，不证明跨语言召回。
- 所有结果字段都是演示内部的语义投影，不是生产 DTO。特别是“依据失效”展示的是续页错误，不是新加的第四种搜索 status 或公共错误码。
- 全文示例的 UTF-16 范围从原始字符串计算，含 emoji 前缀；版本值仅为演示不透明身份。未模拟磁盘文件、Zotero source owner、字节映射或平台差异。
- 来源变化后的示例演示“旧候选核验失败、没有可返回片段”的受限路径；它不规定所有缺口一律 limited。其他可用材料可正常完成并说明缺口，依实际方法、核验和预算判断。
- 续页示例使用明确的依据变化；不另行发明 provider 短暂不可用时的公共返回形态，也不机械让未变化的词法轮次失效。
- 停止确认、成功批次、重启与发布是按钮输入的假设事实，未创建 durable operation、执行外部效果或验证真实竞态。用户意图提交复核只在单线程内存中演示。
- “匹配依据变化”按钮表示已确认与该候选相关的证据变化，不代表任意缓存刷新可以清空 screened_out。完整匹配依据的生产表示由规格／实现确定。
- 2k／10k／25k 只有标签，不分配大库、不生成向量、不计时。临时检查工件放在 `/mnt/HotData/tmp`；本地项目只保留此小型说明与 HTML。

## 已有证据与仍需取得的证据

| 证据层级 | 目前能支持的结论 | 不能支持的结论／后续承担者 |
| --- | --- | --- |
| 本次合成演示 | 可审阅的行为表达；演示脚本自身能执行，用户可指出遗漏或矛盾 | 不能证明生产代码遵守契约、真实模型质量、性能或持久化恢复 |
| [非向量基础交付](https://github.com/leike0813/zotero-agents/issues/88#issuecomment-6018603386) | 已完成三搜索入口的非向量能力及现有来源／分页验收，具体范围见该票原始证据 | 不外推为向量增强、所有 Zotero／平台组合或推荐质量达标 |
| [有界引擎验证](https://github.com/leike0813/zotero-agents/issues/91#issuecomment-6010051020) | 2k／10k 冻结配置的候选评分／重排原型证据；限定输入及规模 | 25k oracle 准备超时，查询配置未测；复制身份压力数据与冻结查询没有人工相关性金标签，不证明推荐质量 |
| [引擎选型](https://github.com/leike0813/zotero-agents/issues/84#issuecomment-6019346923) | SQLite／既有 Repository 持有正式事实，Rust 范围内评分与精确重排的路线 | 候选内精确重排不保证全范围精确 top-k；选型不等于生产实现或目标规模已通过 |
| [实施与生产验收](https://github.com/leike0813/zotero-agents/issues/92) | 继续承接既定验收范围 | 尚需真实原文／分析材料与人工中英及跨语言相关性评价、缺材料推荐质量、真实来源与范围校验、Repository 并发、维护故障恢复、25k／冷态／资源／备份及七平台证据 |

数值相关性阈值、候选预算及批次并发不由合成按钮结果决定，也不在这里假定默认值。用户若认为某组样例揭示了新的产品取舍，应明确提出，并作为新决策处理。

## 本地可运行检查

演示自带 `demo.check()`，检查 UTF-16 定位、旧正文排除、分页依据与输入锁定、词法回退、推荐不可用、拒绝与失败 apply、材料不足待审、待生效范围、取消、发布后独立失败和重启。页面底部的“检查演示脚本”可直接运行。

也可以从仓库根目录运行以下命令，仅执行演示的纯状态模块：

```sh
node <<'NODE'
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('artifacts/vector-retrieval-wayfinder/issue86-contract-prototype.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const context = vm.createContext({structuredClone});
vm.runInContext(script, context);
console.log(vm.runInContext('demo.check()', context));
NODE
```

当前纯状态检查 14 条通过；使用已有 jsdom 走完 8 组引导、81 次点击，无脚本错误。已有 Chromium 检查确认：推荐不可用时旧内容单独标记并保留，390px 视口没有横向溢出，无页面脚本错误。这些数字只说明演示能运行，不是生产验收通过数。

两个项目工件合计约 40 KB；浏览器检查截图约 285 KB，位于 `/mnt/HotData/tmp/wayfinder-86-recommendation.png`。Chromium 的临时目录也通过 TMPDIR 指向该目录，没有下载依赖或构建大库。

本次资产保留在本地规划目录，未提交、未切分支，生产模块不吸收演示 reducer。四组实际反馈已记录，本票完成样例审阅；OpenSpec 交接票继续映射规格与证据，真实质量及生产风险由既有实施验收承担。
