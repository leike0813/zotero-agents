# 验证记录

本 change 尚未完成；本文件不构成全协议 100% 或 Zotero 实机验收通过声明。

## 已修复的生产路径

- Topic Planner 的输出 Schema、wire payload 与 TS 重建器共享 TopicPlanPayload。原运行的 invented resolver 在 RPC 前被拒绝；不转换历史结果。规范 resolver、scope、revision、basis 和 relation 由同一契约校验。
- create/update Topic hook 复用工作流包内 materializer，经 resultContext/bundleReader 读取、重写嵌套 manifest 并提交 `{bundle, assets}`。保留受控 ID、256 资产、单资产 5 MiB、总量 50 MiB 的限制，移除宿主旧 materializer 与上下文第二参数。
- literature-analysis/import-notes 共用扁平 RegularItemDetailDto 投影，省略未提供的 artifact/source 字段。错误按 Host retryable 分类；结构错误不可重试，已写笔记保留。
- 错误诊断保留稳定 code、capability、阶段、Schema 和有界字段位置；map 用户键隐藏为通配符，不输出正文、标签值和本地路径。
- 真实标签链路进一步暴露并修复了词表 save/load/export 的 hash 不一致、审计遍历 revision 与复验 revision 不一致，以及审计 tagDigest 的 wire 前缀漂移。
- Worker graph 页使用实际 `section` 描述器；Topic patch 的短 errors 页与 JSON chunks 按生产 section 名分离，避免 `oneOf` 同时匹配。图聚合权重保留有限正数语义，包含小数与超出安全整数范围的值。
- Reverse Host 错误以实际 `{code, details?}` 为契约；TS 发送前校验，Rust 严格解码原始错误，不再通过测试投影掩盖结构差异。生产 handshake Schema 与现有生产 TS 接收器一致，移除 isolated-shadow 旧形态。
- WebDAV 的读取状态统一为 Host 实际返回的 `available`；写入请求未提供 `ifMatch` 时省略该字段，避免发送非法 `null`。
- Rust 的 Workbench 根对象检查四个必填区域及其对象类型；现有读取夹具改用当前规范 state，并直接向生产入口发送缺失、未知和错误类型的区域负例。
- Rust 公共错误码限定为共享 Schema 中的枚举，私有 tag audit/Host reason 保留在有界 details 中，维持 v12 的 unavailable 分类。大结果的 content-transfer locator 不再被证据收集器误当成业务 DTO，也不自动获得业务结果执行记录。

## 已执行验证

```powershell
npx tsc --noEmit
npx tsc -p packages/synthesis-contracts/tsconfig.json --noEmit
npm run check:synthesis-contracts
npm run check:builtin-workflow-manifest
npm run check:synthesis-service-boundary
npx openspec validate fix-synthesis-workflow-contract-parity --strict
cargo +nightly-2026-07-25 test --workspace --locked --no-fail-fast --manifest-path rust/synthesis-sidecar/Cargo.toml
npx tsx scripts/run-node-test-shards.ts --suite synthesis-native-stage1
```

上述类型、契约生成、163 文件的 builtin manifest、服务边界、OpenSpec 和 Rust workspace 检查通过。native stage1 的 56 个文件在四个分段中通过：client contracts 17、packaging contracts 2、production 29、workflow producers 8。后续局部修改另跑对应回归；完整输出位于本机 `.scaffold/test/synthesis-*.log`，不把未执行的平台算作通过。

本轮最终复验：`synthesis-native-stage1-rooted-freeze.log` 四段均 exit=0，56 个文件全部通过；`synthesis-rust-rooted-freeze.log` 的 Rust workspace 465 项通过；`synthesis-worker-rooted-freeze.log` 的 75/75 worker 槽位通过。导出和 WebDAV 两文件的 15 项用例在该清单中重跑通过，结构工具包含原始请求与变异请求的归因检查。Host broker 另有前轮的 129 项通过记录，不计作本轮新增 native 结构覆盖。TypeScript、相关 ESLint/Prettier、Rust fmt/Clippy 和 OpenSpec 再次通过；契约生成、builtin manifest 与服务边界保留前轮通过记录。ESLint 的既有配置排除了四个 renderer/workflow MJS 文件；这些文件不计作 lint 执行证据，实际 hook 路径由生产者回归执行。

五条原故障路径已通过真实 loader/hook → Host facade → native client → 当前源码 sidecar，覆盖落库、读取与重开。其余 tag bootstrap/audit/regulator、literature-deep-reading 和 export-research-bundle 也执行了非空生产者路径与错误传播回归。

## 协议覆盖与证据

本轮继续实现了完整请求 witness：结构扫描保留局部判定，同时独立验证完整请求；229 仅重放根请求确实无效、且根校验错误可定位到相同 keyword/instancePath 的样本。重放先验证同一原始合法请求的 native admission；原始样本自身的业务拒绝不能证明变异导致了拒绝，相关义务继续 uncovered。局部 `not`/union 分支拒绝但整请求合法的样本不会被算作 native 请求拒绝。超过该 HTTP 重放容量的样本仍保留为 uncovered。

新增的真实请求重放发现并修复了 Rust 的 Workbench reviews/reader 子状态闭合字段、必填项、枚举和边界校验，paper ref 批次数量及去重、digest hash 和 library cursor 长度、Tag note 长度、引用查询参数数量，以及 tag audit 超限的稳定 `invalid_request` 分类。resolver/topic apply 的业务拒绝和 maintenance 的异步终态按现有公开语义判断，不把 HTTP 成功或 pending receipt 当成结构接受。

导出测试通过真实 content transfer 读取非空产物，本地路径验证 manifest/正文写出，远端路径验证下载描述，并分别注入畸形结果、typed error 和畸形 error envelope。WebDAV 对 describe/ensure_collection/read_text/write_text 执行非空成功和实际结果拒绝；后三者另执行两类错误运输。启动期 describe 错误与 native 出站请求的拒绝证据仍未关闭。

权威命令：

```powershell
npm run check:synthesis-native-worker-transfer-parity
npm run check:synthesis-cross-language-contracts
```

分母来自生产 roster/registry：135 个 capability、15 个 worker，对应 480 个请求/返回/错误或 header/section 槽位。递归结构另按实际 Schema 图枚举；样本、结构、真实进程和工作流生产者分别报告。全量 `uncovered` 以 `coverage-report.json` 为准。

| 覆盖轴               | 当前结果                              |
| -------------------- | ------------------------------------- |
| 入口正负样本         | 480/480                               |
| TS/Schema 递归结构   | 14,453/14,453                         |
| 跨语言入口槽位       | 438/480，缺 42 项                     |
| 逐结构跨语言关联证据 | 781/14,453，缺 13,672 项               |
| 实际工作流生产者     | 10/10                                 |

当前身份下已记录的 native 分歧为空；这不证明未覆盖路径一致。整体 `ok=false`，协议门禁按预期退出非零。报告包含完整的入口与逐结构 native uncovered 清单，不能用常规测试通过替代该失败状态。

本轮关闭了 13 个旧入口缺口。`library.artifacts.scan_page:result`、`library.items.list_page:result/error` 的旧执行证据未在当前身份下复现，恢复为 uncovered，因此入口覆盖净增 10 项；没有继承旧身份的通过标记。

结构样本由生产 TS 重建器和同源 Schema 执行。native 请求负例绕过 TS 前置校验进入 Rust。返回值和错误帧使用真实 Rust 输出，经生产 TS 接收端校验，并变异收到的输出验证接收端拒绝。worker 输入使用真实进程帧协议；输出不引入测试专用 Rust DTO 或假解码器。

Reverse Host request 的 TS-only 变异不计入 native 拒绝；HTTP `call-completed` 只证明运输，结果接受必须由调用方先断言业务结果。移除了 harness 停止时的自动成功计数。Worker 已有 75/75 槽位的实际通过记录，但任何源码身份变化后仍须重跑。

结构压力扫描已实际完成：入口样本 480/480，递归结构 14,453/14,453，errors、violations 和 uncovered 均为空，未截断。命令须设置 `SYNTHESIS_PROTOCOL_STRESS=1`，并运行 `node --max-old-space-size=16384 --import tsx scripts/synthesis/check-synthesis-cross-language-contracts.ts`。该结果仅完成样本与结构轴；当前源码身份下的跨语言执行与工作流生产者仍由独立 receipt 判断，不能由结构通过推断。

执行证据绑定当前契约、生产源码、工作流、Host adapter、测试 harness 和本地 debug executable。相关源码或样本变化后旧证据失效，必须重跑；缺失、跳过、预算耗尽和仅 mock 的条目不会计入完成。大型数组边界需要专用压力样本，自动探针未分配时仍保留未覆盖义务。

`coverage.crossLanguage.structure` 逐项列出与 TS 结构轴同分母的 native 义务；必须存在绑定当前源码身份的 `structure:<obligation-id>` / `verified` 记录才计入完成。本轮为 781 项建立了配对原始请求、变异请求与 native 拒绝的关联；其余 13,672 项仍未完成。不能把入口槽位通过或 TS 的结构通过倒推成 Rust 的递归覆盖。

## 构建与实机阻塞

- `npm run check:content-package-release -- --current-branch` 失败：dev GitHub content feed 与当前生成的内容包语义不一致。
- `npm run check:synthesis-sidecar-runtime-freshness` 失败：七平台已存在二进制的 build fingerprint 与修复后的源码不一致。
- 保留用户原有二进制改动，未替换 governed binary、未发布内容包、未提交代码。
- 因 preflight 未满足，未执行插件 build，也未运行 `npm run test:zotero:e2e`。PA-03 已注册在既有 full runner 中，其实际验收仍未完成。

## 尚待完成

native 执行轴的 uncovered 必须逐项关闭；全协议门禁目前不能报通过。42 个入口缺口包括 reset/debug 成功结果、reverse-host 的部分返回/错误路径，以及出站 request 的拒绝证据；尚无生产 Rust 调用方的 `library.items.sync_snapshot` 不能用测试专用入口补成通过。逐结构 native 仍缺 13,672 项，包含尚未配对的共享结构、分支、正例及异步/大型数据路径；TS-only 变异不能填充该轴。Linux/macOS CI、Windows CI invocation 与真实 Zotero 验收没有执行证据。OpenSpec 的 2.3、3.1、3.2 和 3.4 保持未完成，直到相应证据齐全。
