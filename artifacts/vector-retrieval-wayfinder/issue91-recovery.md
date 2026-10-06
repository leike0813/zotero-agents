# 验证输入重建与旧数据迁移

2026-10-06，用户确认可能已清理旧实验目录，授权重建并把 `/tmp` 中三档旧实验数据迁至 `/mnt/HotData/tmp`。本次完成输入准备和迁移，尚未运行[验证 Rust 范围内候选评分与精确重排（有界最终批次）](https://github.com/leike0813/zotero-agents/issues/91)的正式性能矩阵。

## 迁移结果

旧目录 `/tmp/issue89-round3-qrbctjv3/` 整体迁至 `/mnt/HotData/tmp/issue89-round3-qrbctjv3/`，包含三份数据库、SQLite sidecar、九份已有JSON报告以及空子目录。18个文件逻辑总大小22443540976字节，约20.90 GiB。

| 压力档 | 新路径（相对目标目录） | 数据库逻辑字节数 |
| --- | --- | ---: |
| 2k | `issue89-run-1791136634103922860/rust.sqlite` | 1214525440 |
| 10k | `issue89-run-1791137172340591976/rust.sqlite` | 6059716608 |
| 25k | `issue89-run-1791139967598740899/rust.sqlite` | 15168462848 |

先用`rsync -a`复制；原件保留到`rsync -acn --itemize-changes`完成，文件内容校验差异为0。期间只读重建产生了目标根目录及2k `rust.sqlite-shm`的mtime变化，校验中只有这两项元数据差异。随后用`rsync -a --remove-source-files`完成移动，仅移除已经成功复制的来源文件，再逐个移除空来源目录。原目录已不存在；没有批量清理其它`/tmp`内容，也没有修改数据库向量。

清单、校验输出和receipt保存在 `/mnt/HotData/tmp/issue91-20261006T032556Z/` 的 `move-manifest.json`、`move-verification.log`、`move-receipt.json`。

迁移后根分区`df`可用75408166912字节，仍约71 GiB，并未观察到与逻辑搬走量相等的空间增加；不能把20.90 GiB称为已释放的物理空间。只读检查未发现仍打开的已删除旧库。根分区是Btrfs，当前权限不能列出其subvolume/快照，物理空间未回收的具体原因尚未确定。本次没有修改快照或文件系统配置。HotData是NFS4挂载，迁移与恢复后可用约235 GiB。

## 重建结果

全部新输入和工具位于 `/mnt/HotData/tmp/issue91-20261006T032556Z/rebuild/`，该目录权限已设为0700。

| 工件 | 结果 |
| --- | --- |
| `query-freeze-private.json` | 在embedding前冻结44条输入、模型和编码要求 |
| `queries-old12-reencoded.f32` | 代码保留的旧12条原文重新编码，49152字节 |
| `queries-new32-private.json`、`queries-new32-replacement.f32` | 新起草同类别/序号/语言的32条查询，向量131072字节 |
| `queries-44.f32` | 两组按顺序合并，44×1024 float32 LE，180224字节 |
| `normalized-2k-flat.faiss` | 从迁移后的2k SQLite向量重建，248806×1024，1019109421字节 |
| `oracle-2k-44.f32` | 复用原Rust顺序float64余弦导出44×248806距离，43789856字节 |
| `build/target/release/issue91-recovery-oracle` | 复用原`round6-oracle.rs`离线重编译，没有安装依赖 |

**32条原问题没有恢复，本次为新冻结查询批次。**旧12条原文来自`issue89/corpus.py`；旧向量文件已不可比对。新32条由scout子代理Bernoulli（MiniMax-M3.1-Flash-Preview）仅依据公开`query_manifest`起草，没有读取私有语料或逐次检索输出，中英文各16条，保持非互译配对及原类别分布。不能将本批结果称为旧第十轮的逐查询复现或历史回归通过。

只重新请求查询embedding，文档向量直接复用数据库。使用现有本机Ollama服务、`qwen3-embedding:4b`、原query prefix、`num_ctx=4096`、`truncate=false`和2560维输出，再用既有`reduce_vectors`以float64做1024维前缀L2归一化，转float32。观测模型digest为`df5bd2e3c74cd8d069d21dc038f1b359fcdc9458fce1c99bd43c9eb1518ff907`，此记录不构成与已删除文件的位级一致性证明。

## 验证及实际准备成本

- 查询形状、有限性和单位范数通过；类别/语言/序号与公开manifest一致。44查询embedding约2.53秒，这是本次准备成本，不是服务P95或硬件对照。
- 矩阵重建与重载核对约55.06秒；全部254777344个坐标与数据库经原`sqlite_vectors`/Faiss归一化后的结果逐位一致。Faiss1.13.2、单线程，仍仅为实验工具。
- 原Rust oracle导出约52.80秒；完整距离矩阵形状及有限性通过。另取4个查询×6个片段，用既有Python顺序float64实现独立检查24个距离bits，差异0。这是抽样交叉核验，不写成全部距离独立核验。
- 原`CorpusTests`五项运行时四项通过，SQLite snapshot测试在NFS临时目录清理时报`Directory not empty`；其SQLite连接未显式关闭，清理阶段仍有NFS句柄。保留该失败；未修改历史测试源码。单独复跑本次使用的四项向量转换、响应校验等检查，四项通过。
- Cargo使用`nightly-2026-07-25`、缓存`rusqlite=0.40.1`（bundled SQLite）、`serde_json=1.0.150`离线release构建成功，约149秒；只在HotData新建独立manifest、lock及target，没有生产Cargo/schema变更。

恢复脚本为上述目录中的`recover.py`，直接复用已有编码、降维和矩阵取数函数。执行命令如下；输出拒绝覆盖，另行复现须把脚本及查询manifest放入新的私有目录，并更新独立Cargo路径。

```bash
recovery_root=/mnt/HotData/tmp/issue91-20261006T032556Z/rebuild
TMPDIR="$recovery_root" PYTHONPYCACHEPREFIX="$recovery_root/pycache" uv run --project="$HOME/.ar" --locked --no-sync -- python "$recovery_root/recover.py" queries
TMPDIR="$recovery_root" PYTHONPYCACHEPREFIX="$recovery_root/pycache" uv run --project="$HOME/.ar" --locked --no-sync -- python "$recovery_root/recover.py" matrix --database /mnt/HotData/tmp/issue89-round3-qrbctjv3/issue89-run-1791136634103922860/rust.sqlite
CARGO_TARGET_DIR="$recovery_root/build/target" TMPDIR="$recovery_root" cargo +nightly-2026-07-25 build --release --offline --locked --manifest-path "$recovery_root/build/Cargo.toml"
timeout --signal=TERM --kill-after=5s 600s "$recovery_root/build/target/release/issue91-recovery-oracle" /mnt/HotData/tmp/issue89-round3-qrbctjv3/issue89-run-1791136634103922860/rust.sqlite "$recovery_root/queries-44.f32" "$recovery_root/oracle-2k-44.f32" 248806 1024 44
```

本报告记录恢复完成时点；随后用户批准资源预算并完成[有界最终批次](issue91-results.md)。2k／10k八个配置通过，25k构建／替换／备份完成但完整oracle准备超时，四个查询配置未测。恢复成本及正确性检查单列，原1600预算负例和历史报告保持有效；新冻结批次仍不能替代已删除查询的历史复现。
