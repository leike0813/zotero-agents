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

native 执行轴的 uncovered 必须逐项关闭；全协议门禁目前不能报通过。42 个入口缺口包括 reset/debug 成功结果、reverse-host 的部分返回/错误路径，以及出站 request 的拒绝证据；尚无生产 Rust 调用方的 `library.items.sync_snapshot` 不能用测试专用入口补成通过。逐结构 native 仍缺 13,672 项，包含尚未配对的共享结构、分支、正例及异步/大型数据路径；TS-only 变异不能填充该轴。Linux/macOS CI、Windows CI invocation 与真实 Zotero 验收没有执行证据。OpenSpec 的 2.3、3.1、3.2 和 3.4 保持未完成，直到相应证据齐全。
