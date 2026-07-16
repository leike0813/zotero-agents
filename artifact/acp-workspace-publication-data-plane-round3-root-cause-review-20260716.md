# ACP Workspace publication data plane Round3根因复盘

## 结论

Round3成功降低了publication payload，但没有实现结构delta的增量DOM应用。Chat accepted boundary trace中的106个唯一tool call都会新增tool item；共享renderer遇到尚无row的upsert后返回false，Chat随即执行完整transcript render。完整render会重建virtual page视图、重挂载全部可见row、测量全部row，并可能因高度变化再次安排整窗RAF。

receiver还把tail page的新item持续追加到同一个items数组，没有按page limit淘汰头部，也没有推进startCursor。因此page mirror和virtual layout扫描范围会随累计边界增长。这与结构fallback叠加，解释了bytes已从约5.41 MB降到约369 KB，而target-active仍比closed高一个数量级。

## 证据

- Chat trace：1750 thought chunk、1191 message chunk、265 tool update、106个tool call、3个usage update；106个toolCallId全部唯一。
- Round3：107 transcript delta、106 message-count region、1 snapshot、0 resync；post/prepare/signature总开销远低于一秒。
- target-active formal：平均约243秒，panel render lifecycle约63.9秒，event-loop drift约216.6秒。
- `applyAssistantTranscriptEffects()`对新upsert设置structural并返回false；full renderer在order变化时逐row remove/append，随后逐row读取layout。
- `applyMutations()`对新upsert只执行push，未限制items长度。

## 架构判断

根因属于Chat/Skills共享child data plane。Skills之所以通过round3 target-active，是因为其delta较少且没有Chat每个tool boundary对应的额外count render，并不代表共享renderer正确。修复必须统一item/row identity、selected-page边界和结构DOM算法，不能添加Chat-only特判或重写低开销coordinator。

## 非根因但需同步修复

- Chat count publication仍先投影完整panel model。
- Replay profile把displayMode硬编码为live。
- profile窗口开始前的初始化publication迟到ACK污染当前R3聚合，造成214/215假失败。
- 没有legacy listener时仍存在不必要的frontend/conversation snapshot物化入口。

## 实施与验证状态

本轮已实现有界tail page、原子mutation batch、显式`rowKey + itemIds`展示身份、
结构keyed reconcile、dirty-row测量、typed counts直出、共享child render controller、
profile-owned publication stage和真实display mode记录。Chat与Skills没有新增各自的
transcript发布或渲染状态机。

Node定向回归、TypeScript build、全仓ESLint、严格OpenSpec校验以及Zotero UI lite
均通过；Zotero UI包含production Chat/Skills target-active与真实嵌套Workspace frame
确认。`npm run lint:check`仍被三个本轮未修改文件的既有Prettier差异阻断，本轮改动
文件的Prettier检查通过，生成的help-docs无差异。

正式same-trace boundary logical/recorded-cadence矩阵仍需从Dashboard Replay入口采集；
本轮没有修改用户display mode，也没有用测试trace替代正式性能证据，因此暂不声明
Chat target-active耗时或drift预算已经达标。
