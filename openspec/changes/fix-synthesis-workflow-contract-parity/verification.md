# 验证记录

本 change 尚未完成；本文件不构成全协议 100% 声明。PA-03 的 Zotero 实机 apply 验收已通过，完整协议执行覆盖仍未完成。

最新本地冻结身份为 `f56041b08b46b262dd987e98c8c87bd8963c08ba77464bc9bafa82dbf9f9f58e`。七平台 `39047955654` 已同步 fresh，当前源码 PA-03 `7bdef598-9302-48e6-a9b9-4c7141fc3cd8` 通过；完整 stage1 56 文件、worker 75/75、类型与相关 lint/格式检查通过。全量结构扫描无截断，native 入口为 445/480、结构为 920/14,458，整体仍失败。以下保留早期运行记录以便追溯；当前逐项结果与完整 uncovered 见 `coverage-report.json`。

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
| TS/Schema 递归结构   | 14,458/14,458                         |
| 跨语言入口槽位       | 445/480，缺 35 项                     |
| 逐结构跨语言关联证据 | 920/14,458，缺 13,538 项               |
| 实际工作流生产者     | 10/10                                 |

当前自动 witness 收据中的 native 分歧为空；额外观察到的 `get_by_ref` 嵌套必填字段接受差异单列在报告的 `knownUncoveredProtocolGaps`，尚未修复。这不证明未覆盖路径一致。整体 `ok=false`，协议门禁按预期退出非零。报告包含完整的入口与逐结构 native uncovered 清单，不能用常规测试通过替代该失败状态。

本轮关闭了 13 个旧入口缺口。`library.artifacts.scan_page:result`、`library.items.list_page:result/error` 的旧执行证据未在当前身份下复现，恢复为 uncovered，因此入口覆盖净增 10 项；没有继承旧身份的通过标记。

结构样本由生产 TS 重建器和同源 Schema 执行。native 请求负例绕过 TS 前置校验进入 Rust。返回值和错误帧使用真实 Rust 输出，经生产 TS 接收端校验，并变异收到的输出验证接收端拒绝。worker 输入使用真实进程帧协议；输出不引入测试专用 Rust DTO 或假解码器。

Reverse Host request 的 TS-only 变异不计入 native 拒绝；HTTP `call-completed` 只证明运输，结果接受必须由调用方先断言业务结果。移除了 harness 停止时的自动成功计数。Worker 已有 75/75 槽位的实际通过记录，但任何源码身份变化后仍须重跑。

结构压力扫描已实际完成：入口样本 480/480，递归结构 14,458/14,458，样本与 TS 结构轴的 errors、violations 和 uncovered 均为空，未截断。命令须设置 `SYNTHESIS_PROTOCOL_STRESS=1`，并运行 `node --max-old-space-size=16384 --import tsx scripts/synthesis/check-synthesis-cross-language-contracts.ts`。该结果仅完成样本与结构轴；当前源码身份下的跨语言执行与工作流生产者仍由独立 receipt 判断，不能由结构通过推断。

执行证据绑定当前契约、生产源码、工作流、Host adapter、测试 harness 和本地 debug executable。相关源码或样本变化后旧证据失效，必须重跑；缺失、跳过、预算耗尽和仅 mock 的条目不会计入完成。大型数组边界需要专用压力样本，自动探针未分配时仍保留未覆盖义务。

`coverage.crossLanguage.structure` 逐项列出与 TS 结构轴同分母的 native 义务；必须存在绑定当前源码身份的 `structure:<obligation-id>` / `verified` 记录才计入完成。本轮为 781 项建立了配对原始请求、变异请求与 native 拒绝的关联；其余 13,677 项仍未完成。不能把入口槽位通过或 TS 的结构通过倒推成 Rust 的递归覆盖。

## 开发交付与构建准备

用户已授权提交并派发七平台开发预构建，以及发布一个 dev patch 内容包。原有 21 个二进制改动先以 `34e85554c` 保留；修复以 `c224e609a` 提交，dev 版本变更以 `d729ef9890501f2a3b27a6a112c6d727e7b399bf` 提交，均推送至 `origin/dev`。正式内容版本保持 0.8.9，插件版本保持 0.9.0。

- 内容包 `0.8.10-dev.4` 已由 [run 39036202839](https://github.com/leike0813/zotero-agents/actions/runs/39036202839) 发布至 dev。ZIP 为 423 文件、4,983,327 字节，SHA-256 为 `a193dacedf59b82a52413d5c44138486c838c7866dcb85bb3e80483306fcd9de`；stable/beta feed 子树未改变。`npm run check:content-package-release -- --current-branch` 回读通过。
- 七平台开发预构建 [run 39036194424](https://github.com/leike0813/zotero-agents/actions/runs/39036194424) 绑定上述完整 source SHA，request ID 为 `ssdp-db653e6b-f94a-4456-8ac2-bedc376a11d5`，远端七平台构建和不可变集合发布均已成功。aggregate 为 `0965926a3007a9c33c0789b9ef4abcd385a9e29dcfc7488c9e1cafe27d0cb81c`，准确 prebuild commit 为 `1d4e0e0c13dbd2905f91056628ce50dec648774f`。下载一度报 `curl 28`，经相同 run 的精确集合恢复后，operation JSON 已返回 `status=complete`、`sync.ok=true` 和 `freshness.ok=true`，七平台全部同步。正式发布验证状态独立为 `blocked`。证据见 `.scaffold/test/synthesis-dev4-prebuild-operation.json`。
- Host CLI freshness、Host 内容及文档、canonical validators、163 文件的 builtin manifest、Windows ACP bridge freshness 均通过。主题综合四个包共 41 文件、深读包 23 文件、图模板 13 文件在仓库外当前源码快照中重新生成，与工作区逐文件比较无差异。证据见 `.scaffold/test/dev4-preflight-*.log` 和 `dev4-preflight-renderers.json`。
- 全部 preflight 就绪后，`npm run build` 与 `npm run check:help-docs` 已通过，帮助文档为 504 文档、53 资产。首轮 PA-03 实机运行因测试模块未继承 dev 编译常量而拒绝 dev 内容安装，foundation 的主版本参数也误传为完整版本；两处测试准备已修正，沿用既有 runner 重跑。首轮失败 manifest 为 `f8e7acf5-eab1-462c-856c-9caf9fc0c6c0`，不能计为验收通过。未发布插件或同步 Gitee。

本次推送触发的 [验证 run 39036147988](https://github.com/leike0813/zotero-agents/actions/runs/39036147988) 已在 Linux、Windows、macOS 实际选择同一份 56 文件清单，三平台均执行 Rust workspace、client contracts、packaging contracts、production routes 和 workflow producer 分段，但总状态均失败。三个平台均缺少三个内置 Skill 子模块；Linux 另有 HTTP 测试在异步线程排空之前读取计数，macOS 另有打包夹具的 tar 失败。因此 coverage gate 未执行，receipt job 跳过。子模块准备已补入三平台验证 job 与 PR gate；HTTP 测试保持原线程数限制，改为有界等待，Windows 本地 4 项通过。修正后的远端 CI 尚未执行；原 coverage report 是此前冻结身份下的记录，不自动继承为后续测试源码的当前执行收据。

macOS 使用的官方 `macos-15-arm64/20260907.0337` 镜像明确预装 GNU Tar 1.35，命令为 `gtar`。验证 job 已将该工具作为确定性归档测试的 `tar`，不安装依赖、不跳过测试，也不改变预构建归档算法。下载恢复另将精确 commit 获取改为 partial fetch 与指定集合的 sparse checkout，避免读取历史集合；239 的真实本地 Git 回归先证明旧实现会展开无关集合，再验证只展开结果指定集合且 HEAD 仍为准确 commit，六项通过。该下载脚本不属于 source/build fingerprint 或预构建 pipeline revision 的输入；七平台构建身份保持有效。

## 尚待完成

### 实机发现的首个计划边界

dev.4 已通过生产安装入口安装到隔离数据目录。此前两次准备失败分别保留在 manifest `f8e7acf5-eab1-462c-856c-9caf9fc0c6c0`（版本参数、测试调试态）和 `1ac11042-64b7-4612-bd96-fe26a077c8ea`（空图 hash 被测试错误要求非空）；另一次 `1ba5665f-decf-42e4-b2dd-3a2ce97afb57` 因网络回退旧镜像 0.8.8 被准确版本断言拒绝。dev canonical 验收现将临时 mirror 指向 configured primary，结束后恢复，不发布或同步镜像。

manifest `e0606ddf-3de5-4df8-8b37-40ab9c6d5d3a` 通过 foundation 并安装准确 dev.4，随后在首个计划发生真实 Rust CAS 冲突：初始图没有 state，`reconcile_plan` 却向提交传入 `Some("")`，而 repository 要求 `None`。修复后又由真实 TS 接收端发现 receipt 的空 `before_graph_hash` 被 Schema 拒绝。两处均已有红例；Rust 按无 manifest 传入 `None`，同源 receipt Schema 允许初始空字符串并保留 4096 上限，corpus 增加首笔提交。现有测试改为从空库规划，再验证过期 revision 与重开；14 项 native 主题变更/producer、29 项契约、465 项 Rust workspace 均通过。此修复改变 source/build fingerprint，`39036194424` 仍只证明修复前源码，须重新预构建后再执行插件与 Zotero 验收。原 438/480 与 781/14,453 仅为之前冻结身份，不是本次源码的当前收据。

本次源码已通过 56 文件 native stage1（17/2/29/8）、75/75 worker 槽位、129 项 Host facade，以及全量结构压力扫描。当前扫描为入口样本 480/480、TS 结构 14,458/14,458、native 入口 441/480、native 结构 781/14,458、工作流生产者 10/10；完整清单见 `.scaffold/test/dev4-first-plan-coverage.json`。native 仍缺 39 个入口槽位和 13,677 个结构义务，`ok=false`。reset/debug 成功结果、reverse-host 的部分返回/错误路径，以及出站 request 拒绝仍未关闭；尚无生产 Rust 调用方的 `library.items.sync_snapshot` 不能用测试专用入口补成通过。TS-only 变异不能填充 native 轴。新 native executable 或相关源码再变化后必须重新绑定执行收据。

CI2 [run 39038898024](https://github.com/leike0813/zotero-agents/actions/runs/39038898024) 的 Linux/macOS 56 文件、Rust workspace 和 worker gate 已实际通过，最终在完整 cross-language coverage 的 uncovered 门禁退出 1，未发生 OOM。Windows 的最终步骤结果仍需单独核对；三平台此前都已实际执行相同清单，不能再描述为从未执行。首次计划修复对应的最新 CI 为 [run 39040319245](https://github.com/leike0813/zotero-agents/actions/runs/39040319245)，七平台预构建为 [run 39040341848](https://github.com/leike0813/zotero-agents/actions/runs/39040341848)，source SHA `44ea54654c0e5434b8684b096297ea32df603674`。当前 build fingerprint 为 `ab5594803da39c7ee2af216a06d957156656ce416db6472b183fcaa4297e5982`。

额外 `workflow-host` 分片未通过：`187-workflow-host-contract-governance` 在未修改的翻译/MinerU 文件发现 `globalThis.Zotero` 引用，日志为 `.scaffold/test/dev4-workflow-host-shard.log`。这两处属于本次 Synthesis 修复之外的既有内容，未修改、未再次 bump 内容版本。主线不把该分片计为通过。OpenSpec 的 2.3、3.2 和 3.4 保持未完成，直到相应证据齐全。

### 当前源码开发交付与实机结果

- [七平台 run 39040341848](https://github.com/leike0813/zotero-agents/actions/runs/39040341848) 已完成，准确 source 为 `44ea54654c0e5434b8684b096297ea32df603674`，request 为 `ssdp-b5ae21c6-c3d6-4ef0-b65c-52fc7a8aec59`，aggregate 为 `98362e96c0ab884417b22cd6ff12a0e05427f518b3b1097874fa99a159c993b8`，prebuild commit 为 `cf40c271fe96c57affd821141c2f64bb99ee4703`。operation JSON 的 `status=complete`、`sync.ok=true`、`freshness.ok=true`，七目标同步完成；正式发布验证仍为 `blocked`。证据为 `.scaffold/test/dev4-first-plan-prebuild-operation.json`。
- 当前源码的 `npm run build`、`npm run check:help-docs` 和 `npm run check:synthesis-sidecar-runtime-xpi -- --xpi=.scaffold/build/zotero-agents.xpi` 均通过。XPI 七目标无缺失、无额外资产，build fingerprint 为 `ab5594803da39c7ee2af216a06d957156656ce416db6472b183fcaa4297e5982`。日志为 `.scaffold/test/dev4-first-plan-{plugin-build,help-docs,xpi}.log`。此生产 XPI 在 E2E 构建清理之前已实际验证，未发布插件。
- PA-03 的首次修复后运行 `0d88d2e1-c360-4338-8ad3-6a57182717e2` 已越过 CAS 并落库，随后发现测试 fixture 只改 envelope 标题而未改 topic section。详情按 section 投影符合生产规则；fixture 现同步两处标题。最终 manifest `34fbc1a7-4254-4aff-8384-67ffc5fbbfce` 为 `complete`，2 selected / 2 passed / 0 failed / 0 skipped，真实 Zotero 10.0.2、隔离种子、当前源码 sidecar、生产安装入口安装准确 dev.4、生产 workflow loader/hook、规范计划与 topic create/update 落库读回均通过，family cleanup 和 health gate 通过。日志为 `.scaffold/test/dev4-first-plan-pa03-fixture.log`。sidecar 重开由 Node native 测试另行验证，PA-03 不声称执行了进程重启。
- 最新 CI `39040319245` 三平台已执行相同 56 文件。Linux/Windows 在全量 uncovered 门禁失败；macOS 的 production 与 producer 分段通过，packaging 的归档重打包哈希不一致。Apple `file_cmds/gzip/gzip.c` 的 `handle_stdout` 对管道输入使用当前时间，GNU gzip 的同一最小实验 header MTIME 为零，因此 macOS CI 在现有 GNU tar 工具准备中显式设置 `GZIP=-n`。193 在准确集合 round-trip 用例中新增 gzip header 时间戳归零断言，本机 17 项通过；没有改生产预构建算法或其身份。远端修正尚待验证。
- reset/debug 的真实成功补测在第一条 debug reset 调用失败；生产 `runtime_production_ports.rs` 使用 `DebugMaintenanceApplication::new`，未安装 `DebugMaintenanceOperationPort`，`run_maintenance` 返回 `unsupported_operation`。随后独立隔离 probe 捕获两条路由的原始 wire envelope：HTTP 503、`code=capability_not_found`、`details.reason=unsupported_operation`、`retryable=false`，证据为 `.scaffold/test/dev4-reset-wire-probe.log`。不补计成功覆盖，临时测试已撤回，生产实现未修改。既有 `synthesis-native-webdav-maintenance-surface` 规格还要求生产 owner、排他执行、checkpoint/backup 和崩溃恢复；该缺口涉及实际维护能力实现，无法用成功 mock 或伪 DTO 解决。

### 最终本地证据冻结

七平台同步和验收修正已提交为 `9859513cc3fe07e49d298e3a5807ca02c2c6c35c` 并推送 dev，新 CI 为 [run 39042690801](https://github.com/leike0813/zotero-agents/actions/runs/39042690801)。本地 E2E 之后重新执行了完整 56 文件 native stage1，四段 17/2/29/8 全部 exit=0；75/75 worker 槽位、TypeScript、OpenSpec 和相关格式/lint 检查通过。日志分别为 `.scaffold/test/dev4-final-freeze-stage1.log`、`dev4-final-freeze-worker.log`、`dev4-final-types.log` 和 `dev4-final-openspec.log`。

完整压力扫描已更新 `coverage-report.json`，执行身份为 `ef304c7fc228b835c075ac432682a53fec6b5e2783c1fcec4dba4b4fe9d7714c`。入口样本 480/480、TS 结构 14,458/14,458、工作流生产者 10/10；native 入口 441/480、native 结构 781/14,458。扫描无截断、无预算耗尽、`errors=[]`、`violations=[]`，全量 uncovered 保留在报告中；整体 `ok=false`、命令退出 1，不能报告 100%。后续源码、测试或 executable 改变时仍须重新冻结，不能沿用本次执行标记。

E2E 结束后重新生成的开发 XPI 位于 `.scaffold/build/zotero-agents.xpi`，59,075,862 字节，SHA-256 为 `e0a0e8e234fb89699ed768a8dccdab3dbc85339d8a43ecd85bbf7025129d276c`。生产 build、帮助文档检查和七平台 XPI 检查再次通过，日志为 `.scaffold/test/dev4-final-delivery-{build,help-docs,xpi}.log`；未发布此插件。报告身份在最终构建后复核一致。

CI `39042690801` 已完成。三平台均通过 Rust workspace、同一份 56 文件 native stage1 和 75/75 worker；macOS 的 gzip 时间戳与归档往返修正已实际通过。三个平台最后都在 native 覆盖门禁退出 1，报告一致为 441/480、781/14,458、`errors=[]`，没有截断；receipt job 跳过。完整日志为 `.scaffold/test/dev4-final-ci-{linux,windows,macos}.log`。

交付后继续补 worker 结构证据：新增真实 worker 帧回归，关联同源结构样本、合法原始 header 与变异 header。只有实际 `invalid_request` 拒绝可记录负例，direct-run 的成功结果可记录正例。paged worker 的取消仅证明 framing admission，尚未执行的计算阶段校验继续 uncovered。最初观察到的 38 项取消不构成最终语义分歧，已纠正证据分类；不修改生产行为掩盖该证据缺口。上述交付冻结身份现为历史快照，须在本轮测试扩展完成后重新执行完整清单并冻结报告。

### Worker 结构执行发现的新增协议缺口

对上述取消样本继续完成输入及计算后，确认 14 项非法 header 仍产生真实 `result_begin`，包括算法/契约版本、TagProtocol 未知/缺失字段及范围、Text/OptionalText 长度和 MatcherPolicy 枚举，见 `.scaffold/test/dev4-worker-compute-probe.log`。生产 `PagedInputValidator` 现直接从嵌入的 registry、worker 和 transfer Schema 读取这些约束，保持 `invalid_request` 分类；范围、枚举和版本不另外复制为手写常量。用于确认红例的临时帧组装测试代码已移除，长期回归继续复用现有真实 worker 驱动器。

严格边界同时暴露了生产标签 worker 请求漏发 `protocol.version`，现由共享构造器补齐持久化版本，索引请求提供其固定规则版本。标签初始化回归先失败、修复后通过，日志为 `.scaffold/test/dev4-tag-producer-header-{red,green}.log`。Unicode 正例随后发现 Rust 以 UTF-16 单元误判 Schema 的字符数上限，已改为 Unicode 字符计数；旧协议及概念测试的短 hash/空 protocol 基线改为合法值，没有放宽生产校验。对应两个 Rust crate 的 15 项测试通过。

嵌入的协议 JSON、production capability/operation manifest、artifact schema manifest 与 repository SQL 现纳入源码及构建 fingerprint，避免仅更改这些编译输入后仍把旧二进制判为 fresh；193 的输入边界回归先红后绿。465 项完整 Rust workspace、Clippy、fmt、TypeScript 和相关 ESLint/Prettier 已再次通过，56 文件 Node native stage1 的四段 17/2/29/8 均 exit=0，75/75 worker 槽位通过；相关日志以 `.scaffold/test/dev4-worker-header-` 开头。编译输入最后补查的三个 manifest 另有 `.scaffold/test/dev4-embedded-manifests-{red,green}.log`。此轮生产 Rust 修改需要新的七平台集合与插件/E2E 验收，先前的 `39040341848` 只证明修改前源码。dev 内容交付字节未变，版本仍为 `0.8.10-dev.4`。

Related Items 复用 229 已有增量重建用例，增加真实成功回执、畸形 result、typed Host error、畸形 error envelope 的接收证据，并断言 Host 失败后图仍已提交、待外部写入的 effect 重开可恢复。该用例先因缺少结果证据失败，扩展后通过，日志为 `.scaffold/test/dev4-related-items-evidence-{red,green}.log`；出站 request 的 TS-only 变异仍不计入 native 拒绝。

### Worker 修复后的七平台与宿主验收

- [run 39047955654](https://github.com/leike0813/zotero-agents/actions/runs/39047955654) 已完成七平台构建、不可变集合发布和本地事务同步。source 为 `752e0e525fae02c29e3270826d79237f2f2e2be9`，request 为 `ssdp-786d4bc7-ee90-4682-9708-47310a653d58`，aggregate 为 `14aa764fa7a2bb87bd5f6d84789ec89ac1c6372b769d3ab04da28bb0265b40e3`，prebuild commit 为 `491bbc32f1762c144ff74e0eb53e6313cc925dc8`。typed operation 的 `status=complete`、`sync.ok=true`、`freshness.ok=true`，正式验证状态独立为 `blocked`，证据为 `.scaffold/test/dev4-header-prebuild-operation.json`。
- Host CLI、Host 内容及文档、ACP bridge、canonical validators 和 163 文件的 workflow manifest 复验通过；隔离重建的主题四包 41 文件、深读 23 文件及图模板 13 文件均无漂移。dev 内容回读摘要仍为 `a193dacedf59b82a52413d5c44138486c838c7866dcb85bb3e80483306fcd9de`，本轮不再次 bump 或发布。
- 当前 build fingerprint 为 `cab5e046c525633d84c37cb6ba1501ffabe1c2237506a044cb6b6e23ef1f6634`。生产 build、504 文档/53 资产的帮助检查及 XPI 七目标资产检查通过；日志为 `.scaffold/test/dev4-header-delivery-{build,help-docs,xpi}.log`。
- 新 PA-03 manifest `7bdef598-9302-48e6-a9b9-4c7141fc3cd8` 为 `complete`，2 selected / 2 passed / 0 failed / 0 skipped / 0 incomplete。真实 Zotero 10.0.2、隔离 seed、当前源码 local sidecar、生产安装入口安装准确 dev.4，非法 resolver 零写入、planner 及 topic create/update 落库读回、cleanup 与 health gate 全部通过。日志为 `.scaffold/test/dev4-header-pa03.log`。此用例不声称进程重开；重开证据来自 Node native 测试。
- 最新 [CI 39047912156](https://github.com/leike0813/zotero-agents/actions/runs/39047912156) 三平台均已完成。Rust workspace、同一份 56 文件 native stage1 和 75/75 worker 均通过；最终覆盖报告三平台一致为入口样本 480/480、TS 结构 14,458/14,458、native 入口 443/480、native 结构 920/14,458、生产者 10/10、`errors=[]`。三平台均因 uncovered 门禁退出 1，receipt job 跳过。日志为 `.scaffold/test/dev4-header-ci-{linux,windows,macos}.log`；这些 CI 结果仅绑定上述 source，不继承给后续测试改动。
- E2E 后生产 XPI 已重新构建并复验，日志为 `.scaffold/test/dev4-header-final-{build,help-docs,xpi}.log`。插件未发布。最终本地执行身份与完整 uncovered 报告仍需在本轮测试编辑结束后重新冻结。

`library.items.get_by_ref` 复用同一增量图场景补充非空成功、实际畸形 result、typed Host error 与畸形 error envelope；断言失败维护操作 `state_changed=false`、保留旧图、稳定 `reverse_host_result_invalid` 或实际运输错误码。红例因缺少结果执行收据失败，补齐后通过，日志为 `.scaffold/test/dev4-get-by-ref-evidence-{red,green}.log`。原夹具缺少 LibraryItem 必填书目字段，新增 TS 接收校验首先暴露了这一点，现正例补齐字段。Rust 原先接受该不完整夹具，说明相应嵌套 required 约束仍有严格性缺口；本次只关闭已实际执行的顶层坏类型和错误运输槽位，不将这些嵌套义务计为通过，也不声称已修复此额外生产问题。

本轮编辑结束后，完整 56 文件 native stage1 四段 17/2/29/8 全部 exit=0，75/75 worker 通过，随后以 `SYNTHESIS_PROTOCOL_STRESS=1` 和 16 GiB Node heap 执行完整结构检查。最终身份为上述 `f56041b...`，样本 480/480、TS 结构 14,458/14,458、native 入口 445/480、native 结构 920/14,458、生产者 10/10。`errors=[]`、结构 `violations=[]`、无截断或预算耗尽；未修复严格性差异另行列明。门禁退出 1，2.3、3.2、3.4 保持未完成。日志为 `.scaffold/test/dev4-header-final-{stage1,worker}.log` 和 `dev4-header-final-coverage.json`。

最终开发 XPI 为 59,192,259 字节，SHA-256 为 `14865c27e3bc97fbb0260b3dcf0b749c0776e3a4bff0593bf9243a21663cc058`。E2E 后已重新 build、检查帮助文档及七平台 XPI 资产；没有发布插件，也没有再次修改内容版本。

## LibraryItem 接收边界补齐（2026-10-18）

继续执行 2.3 时，真实增量图路径复现了嵌套必填字段缺失、超长书目字段和非法 itemKey 仍被 Rust 接受的问题。`ReferenceHostItem` 已移除对象级 `serde(default)`，仅对契约允许省略的 `updatedAt`、`metadataHash` 使用字段默认值。生产 Reverse Host adapter 在 typed 解码后统一检查条目的字符串、字符串数组与安全整数边界；长度和数量限制直接读取嵌入的 reverse-host Schema，以 Unicode 字符计数。`list_page` 与 `get_by_ref` 共用该边界。

229 既有用例现从共享 Schema 派生缺失必填字段和边界负例，并覆盖 null、未知字段、非法 itemKey、数组元素，以及 Unicode 标题上界的真实成功。负例必须先断言 native terminal 为 failed、`state_changed=false`、稳定 `reverse_host_result_invalid`，再用生产 TS 接收器拒绝同一原始结果；随后才记录对应结构义务的 native 收据。两条 Host 读取路径均断言失败后旧图保持可读，既有重开验证继续执行。成功夹具复用已有完整条目投影，未放宽 Schema。

红例日志为 `.scaffold/test/dev4-library-{required,bounds,all-bounds,shapes}-red.log`；定点绿例为 `.scaffold/test/dev4-library-both-routes.log`。本轮 Rust workspace 465 项、Clippy、TypeScript、ESLint、Prettier 和 OpenSpec strict 已通过。最终 56 文件 stage1 的四段全部 exit=0，75/75 worker 通过；日志为 `.scaffold/test/dev4-library-final-stage1.log` 和 `.scaffold/test/dev4-library-final-worker.json`。

完整结构压力检查绑定执行身份 `5bd48f0a12ffa54eb86a62283c62271b0639f7cb35ecf6d1291d3f5fccaddbbc`，结果为样本 480/480、TS 结构 14,458/14,458、native 入口 445/480、native 结构 975/14,458、生产者 10/10。`errors=[]`、`violations=[]`，无截断、预算耗尽或当前身份下的 divergence。55 项新增有效 native 结构义务纳入报告，其余 13,483 项仍未完成；门禁退出 1。完整原始结果为 `.scaffold/test/dev4-library-final-coverage.json`，已同步当前 `coverage-report.json`；此前 `f56041b...` 的报告属于历史收据。2.3、3.2、3.4 保持未完成。

[CI 39051231216](https://github.com/leike0813/zotero-agents/actions/runs/39051231216) 已确认三平台均通过 Rust workspace、56 文件 stage1 与 75/75 worker；覆盖门禁仍因 native 入口 445/480、native 结构 920/14,458 而失败，`errors=[]`。日志保存在 `.scaffold/test/dev4-latest-ci-failed.log`。该 CI 绑定 `a3dbf764ee17fca697729a1a40baad93cae816d1`，不继承为当前未提交代码的 CI 证据。

当前生产代码变化使既有七平台集合及 XPI 的 freshness 证据不再适用于本轮；后续须按既有授权重新提交、构建和实机验收。已发布内容包仍为 `0.8.10-dev.4`。两个 reset capability 的生产执行端口仍为空，缺少真实重置实现及独占、checkpoint 和崩溃恢复证据；它们的成功结果覆盖保持未完成，不以 mock 或放宽门禁补齐。

## 已授权的真实 reset（2026-10-18，验收进行中）

用户已明确批准将两个 reset 的生产实现与隔离验收纳入本 change，新增任务 2.5。原有 2.3、3.2、3.4 继续保持未完成；以上 LibraryItem 覆盖数字是历史执行身份，不能用于本轮源码。

生产 reset 现由 runtime 组合专属 owner，保留 SQLite 连接与 reader pool，使用完整事务删除业务表并保留 schema identity。普通 reset 保留 canonical 文件，clean-install 默认预览，确认后将旧树移到备份。写入前在线备份并校验完整性；durable journal 与同事务 SQLite marker 决定启动恢复。前台排他 admission、后台 owner drain、compute/transfer 状态与 autosync admission 共同阻止并发写入。成功后清除搜索续读缓存和旧 dirty autosync。未调用 Zotero、插件任务库或远程删除。

既有 235 测试扩展的 13 个真实进程用例曾全部通过（`.scaffold/test/dev4-reset-all.log`）：两个非空成功与重开、备份 integrity/内容、四个阶段强杀恢复、备份失败零变更、并发与后台 busy、预览/错误确认零写入、原始 null/超长字段拒绝、搜索续读失效。额外两个 deadline 进程用例通过（`dev4-reset-deadline.log`）：提交前到期恢复原状态，提交后到期保留 reset 结果。Rust workspace 曾通过 466 项（`dev4-reset-workspace.log`），TS、Clippy、ESLint、格式及 OpenSpec strict 已分别通过；后续健康接口修复使上述部分证据需要重跑。

宿主 supervisor 检查补充了一个必要红例：reset 持有排他锁时健康接口返回 503 会触发健康失败重启（`dev4-reset-health-red.log`）。健康 projection 已改用启动时固定 canonical identity，业务读取继续排他；此修复的绿例、最终完整 native suite 与当前协议报告尚待执行。stage1 当前运行日志为 `dev4-reset-final-stage1.log`，运行中的源码后续有修改，因此该运行不能作为最终收据。

执行证据身份现覆盖 SQL 与测试 fixture；对应 freshness 测试先红后绿（`dev4-reset-evidence-{red,green}.log`）。未更新 100% 结论，未再次 bump 内容包，未发布插件。

健康修复的最终定点验收已通过全部 15 项（`.scaffold/test/dev4-reset-health-green.log`），包括排他重置中健康接口保持 ready、业务读取被拒绝；已完成任务 2.5，整体进度 11/14。Rust workspace 当前源码复跑及最终 stage1 仍单独记录。上一轮 stage1 的 Related Items 收据断言在源码运行中变化后失效，不计最终证据；固定源码后的复跑日志为 `dev4-reset-final2-stage1.log`。后续仍须完成全协议 native 义务、三平台 CI 与当前源码 build/实机验收，不据本项 reset 成功归档 change。

固定源码验收结果：466 项 Rust workspace、56 文件 stage1（四段均 exit 0）、75/75 worker、TS、Clippy、ESLint、格式及 OpenSpec strict 全部通过。完整结构压力检查绑定身份 `9d1c602265cb064feb0ac60eb61e5bbb7222fa80061c8a6730cca26d780e5531`，入口样本 480/480、TS 结构 14,458/14,458、native 入口 447/480、native 结构 975/14,458、生产者 10/10。`errors=[]`、`violations=[]`，无截断或预算耗尽；门禁因仍有 33 个入口槽位和 13,483 个 native 结构义务而 exit 1。原始结果为 `.scaffold/test/dev4-reset-final2-coverage.json`，已同步报告。两个 reset result 缺口已消除，未放宽原分母。

另已确认 `library.items.sync_snapshot` 的 Host handler、共享快照契约和 `LibrarySnapshotIndexApplication` 已存在，但 Rust runtime 没有生产消费路径。已向用户询问接入显式维护刷新还是普通 Library Index 读取；尚未接入或为它增加测试专用入口，其三条协议槽位继续列为未覆盖。

## 七平台与当前源码实机验收

源码已提交并推送为 `f34217ba40cc9ae26bb4539291cb16d062f38654`。用户授权的七平台开发预构建 [39094307955](https://github.com/leike0813/zotero-agents/actions/runs/39094307955) 已完成，操作 JSON 为 `.scaffold/test/dev4-reset-prebuild-operation.json`：aggregate `f37bbe4b8b211bc3a8629a321e952b6b09c9354c07db6a28556865c6bebbf854`，准确 prebuild commit `b6e8cd3dcfe33d45fa4d9263e69a355605e535ad`，七目标同步成功，freshness 为 true，build fingerprint `1ea45abf3439fe164bc9443e10acbbba5ae2bc405daa8a6c856a51ef36385988`。正式验证状态为 blocked，与开发预构建完成分开记录。

preflight 的 Host Bridge、ACP、renderer、manifest、validators、内容包检查通过。插件 build 通过；PA-03 首轮在内容安装时遇到 feed_unavailable，未执行到业务断言，未计通过。按相同命令重试后 2 selected/2 passed/0 skipped，准确安装 dev `0.8.10-dev.4`，使用当前源码 sidecar 与 Zotero 10.0.2；manifest 为 `artifacts/test-diagnostics/system-e2e/3ee80b91-c9df-41b9-9410-fb174bdea7b3/run-manifest.json`，失败 manifest 和日志均保留。E2E 后再次普通 build 恢复七平台 XPI，帮助文档和 XPI 原生资产检查通过。XPI 为 59,326,212 字节，SHA-256 `ab039c4b147d13b90775fbeca3bd1e10d7e7c301e82a84d019830f7de4382724`；未发布插件。

[CI 39094291616](https://github.com/leike0813/zotero-agents/actions/runs/39094291616) 的三平台 Rust workspace、56 文件 native stage1 与 75/75 worker 通过，覆盖门禁均因 447/480 入口和 975/14,458 native 结构而失败，errors 为空；日志为 `.scaffold/test/dev4-reset-ci-failed.log`。这是 f34217ba4 的证据，不替代后续扩展测试的 CI。

等待预构建期间仅扩展既有 Reverse Host 测试：代表图和 digest 读取、旧标签绑定迁移、标签 effect 的成功/畸形 result/typed error/畸形 error 均有真实进程断言。摘要在图读取失败时保留，迁移失败保留原始 `[42]`，Tag promotion 不因外部 effect 失败回滚，pending effect 保存稳定解码原因。定点用例和 TS/lint 已通过；当前 source 的完整收据正在 `.scaffold/test/dev4-reverse-final-stage1.log` 复跑，因此 9d1c6022 的覆盖数仍标为历史，未把定点测试虚报为全覆盖。

### Reverse Host 与观察值归因的当前冻结

`.scaffold/test/dev4-reverse-final-stage1.log` 的四段均通过，worker 75/75；其压力扫描为 native 入口 455/480、native 结构 975/14,458。这是随后扩展前的历史快照。新增 readiness 成功/畸形 result/typed error/畸形 error、scan_page 错误运输和 startup probe 成功后激活的 WebDAV describe 错误运输，均复用实际生产进程。失败刷新保留既有 Index；恢复后评分与 Review 读取正常。

结构扫描器新增观察模式，接收真实 native 发射或消费、并由生产 TS 重建器验证的有界合成测试值。只有不改变原值的正向探针及原值满足的分支可归因；所有祖先 union/条件 guard 都必须成立。非法 seed、未选分支、本地负例和合成上限不会得到 native 观察证据。工具回归曾分别因“把合成值计入观察”和“未验证祖先分支”失败，修复后完整 36 项通过。合法读取的结构样本先经真实 native 成功，再交同一观察模式归因；非法请求仍走成对 seed/变异的原始 native 回放。

固定身份 `fb4f7d9522f1a85dae9ce2562dc16bd7de08b4a86398b62b2c4d4752b8beaa39` 的最终 56 文件 native suite（17/2/29/8）全部 exit 0，75/75 worker、TS、ESLint、Prettier 与 OpenSpec strict 通过。日志为 `.scaffold/test/dev4-observed-final2-{stage1,worker,coverage,tsc,eslint,prettier}` 对应的 log/json 文件。压力检查入口样本 480/480、TS 结构 14,458/14,458、native 入口 459/480、native 结构 3,550/14,458、生产者 10/10；errors、violations 与实际 divergence 均为空。2,193 个真实观察值归因 2,608 项（与原回放存在重叠），观察扫描无截断；其 2 项预算耗尽保留未覆盖，基础结构扫描无预算耗尽。

完整报告已同步，整体仍 `ok=false`、命令 exit 1，尚欠 21 个入口槽位和 10,908 个 native 结构义务。19 个 Reverse Host request 缺少真实 native 拒绝证据；未接生产消费者的 sync_snapshot 仍欠 request/result/error，其中 request 与前者重叠。任务 2.3、3.2、3.4 维持未完成，未归档。当前七平台 freshness 和已发布 dev.4 内容回读再次通过，日志为 `dev4-observed-final2-freshness.log`、`dev4-observed-final2-content.log`；本轮未重建或发布插件，未再次发布内容。

三平台 Verify workflow 保留相同 native suite，coverage 命令使用 pipefail 保持失败退出，并在失败后上传完整报告、执行收据与按身份隔离的有界观察样本。YAML 解析和格式已核验，远端执行另行记录，不以本地通过代替三平台执行。

本轮测试与报告提交并推送为 `4de5b255d10abf00b70b986faa80a0fe922812cb`，对应 [Verify run 39098696631](https://github.com/leike0813/zotero-agents/actions/runs/39098696631)。当前 run 仍在执行，未计为通过；准确 source、状态快照见 `.scaffold/test/dev4-observed-ci-snapshot.json`。七平台同步提交 `6dab131d3eb1751a70895fe6ef446b04d1683948` 已推送。工作树随后仅更新此 CI 跟踪记录，测试执行身份保持不变。
