
# scripts/host-bridge/host-bridge-cli-release-governance.mjs
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/host-bridge-cli-release-governance.mjs -->

Host Bridge CLI 发布治理的单一事实源：构建配方读取、Cargo 源码指纹计算、patch/minor 版本提升、release manifest 读写与七平台二进制摘要登记。
源码：[scripts/host-bridge/host-bridge-cli-release-governance.mjs](../../../../../scripts/host-bridge/host-bridge-cli-release-governance.mjs)

## 符号（20）
<!-- node: function:scripts/host-bridge/host-bridge-cli-release-governance.mjs:bumpHostBridgeCliPatchVersion -->
<!-- node: function:scripts/host-bridge/host-bridge-cli-release-governance.mjs:bumpMinorVersion -->
<!-- node: function:scripts/host-bridge/host-bridge-cli-release-governance.mjs:bumpPatchVersion -->
<!-- node: function:scripts/host-bridge/host-bridge-cli-release-governance.mjs:collectBuildInputFiles -->
<!-- node: function:scripts/host-bridge/host-bridge-cli-release-governance.mjs:computeHostBridgeCliBuildFingerprint -->
<!-- node: function:scripts/host-bridge/host-bridge-cli-release-governance.mjs:getHostBridgeCliReleaseStatus -->
<!-- node: function:scripts/host-bridge/host-bridge-cli-release-governance.mjs:isHostBridgeCliBuildInputPath -->
<!-- node: function:scripts/host-bridge/host-bridge-cli-release-governance.mjs:listFiles -->
<!-- node: function:scripts/host-bridge/host-bridge-cli-release-governance.mjs:main -->
<!-- node: function:scripts/host-bridge/host-bridge-cli-release-governance.mjs:normalizeCargoLockForFingerprint -->
<!-- node: function:scripts/host-bridge/host-bridge-cli-release-governance.mjs:normalizeCargoTomlForFingerprint -->
<!-- node: function:scripts/host-bridge/host-bridge-cli-release-governance.mjs:readCargoPackageVersion -->
<!-- node: function:scripts/host-bridge/host-bridge-cli-release-governance.mjs:readFingerprintContent -->
<!-- node: function:scripts/host-bridge/host-bridge-cli-release-governance.mjs:readHostBridgeCliBuildRecipe -->
<!-- node: function:scripts/host-bridge/host-bridge-cli-release-governance.mjs:readHostBridgeCliReleaseManifest -->
<!-- node: function:scripts/host-bridge/host-bridge-cli-release-governance.mjs:readReleaseManifest -->
<!-- node: function:scripts/host-bridge/host-bridge-cli-release-governance.mjs:readSha256File -->
<!-- node: function:scripts/host-bridge/host-bridge-cli-release-governance.mjs:recordHostBridgeCliBinaryChecksums -->
<!-- node: function:scripts/host-bridge/host-bridge-cli-release-governance.mjs:replaceCargoLockPackageVersion -->
<!-- node: function:scripts/host-bridge/host-bridge-cli-release-governance.mjs:replaceCargoPackageVersion -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| bumpHostBridgeCliPatchVersion | 函数 | 347–397 | 中等 | versioning、release-governance、host-bridge | 0 | 执行 patch 版本提升并同步 Cargo.toml、Cargo.lock 与 manifest。 |
| bumpMinorVersion | 函数 | 243–249 | 简单 | versioning、utility、host-bridge | 0 | 递增 semver 的 minor 段并重置 patch。 |
| bumpPatchVersion | 函数 | 235–241 | 简单 | versioning、utility、host-bridge | 0 | 递增 semver 的 patch 段。 |
| collectBuildInputFiles | 函数 | 177–188 | 简单 | filesystem、traversal、build-system | 0 | 收集全部参与构建指纹的输入文件。 |
| computeHostBridgeCliBuildFingerprint | 函数 | 201–215 | 简单 | hashing、build-system、identity | 1 | 汇总全部输入文件计算稳定的 CLI 构建指纹。 |
| [getHostBridgeCliReleaseStatus](../../../symbols/scripts/host-bridge/host-bridge-cli-release-governance.mjs/getHostBridgeCliReleaseStatus.md) | 函数 | 328–345 | 简单 | reporting、host-bridge、release-governance | 2 | 汇总当前发布状态：版本、构建指纹与预构建缺口。 |
| isHostBridgeCliBuildInputPath | 函数 | 119–125 | 简单 | filtering、build-system、host-bridge | 0 | 判断某路径是否属于参与构建指纹的输入文件。 |
| listFiles | 函数 | 101–117 | 简单 | filesystem、traversal、utility | 0 | 递归列出目录下的全部文件。 |
| main | 函数 | 474–530 | 中等 | entry-point、cli、release-governance | 0 | CLI 入口：按子命令执行状态查询、版本提升或摘要登记。 |
| normalizeCargoLockForFingerprint | 函数 | 144–175 | 简单 | normalization、hashing、build-system | 0 | 归一化 Cargo.lock，使依赖解析顺序不影响构建指纹。 |
| normalizeCargoTomlForFingerprint | 函数 | 127–142 | 简单 | normalization、hashing、build-system | 0 | 归一化 Cargo.toml，消除与构建无关的排版变动。 |
| readCargoPackageVersion | 函数 | 217–233 | 简单 | versioning、parsing、host-bridge | 0 | 从 Cargo.toml 中读取 package 版本。 |
| readFingerprintContent | 函数 | 190–199 | 简单 | utility、hashing、build-system | 0 | 按路径类型选择原文或归一化内容作为指纹输入。 |
| readHostBridgeCliBuildRecipe | 函数 | 15–54 | 简单 | configuration、validation、host-bridge | 1 | 读取并校验 CLI 构建配方，要求恰好声明七个 target 与完整工具链。 |
| [readHostBridgeCliReleaseManifest](../../../symbols/scripts/host-bridge/host-bridge-cli-release-governance.mjs/readHostBridgeCliReleaseManifest.md) | 函数 | 316–318 | 简单 | manifest、host-bridge、filesystem | 2 | 读取仓库中的 Host Bridge CLI release manifest。 |
| readReleaseManifest | 函数 | 301–314 | 简单 | manifest、filesystem、host-bridge | 0 | 通用 release manifest 读取与解析。 |
| readSha256File | 函数 | 399–409 | 简单 | hashing、filesystem、host-bridge | 0 | 读取二进制旁置的 sha256 文件。 |
| recordHostBridgeCliBinaryChecksums | 函数 | 411–468 | 中等 | hashing、release-governance、host-bridge | 1 | 逐一登记七平台预构建二进制的 sha256 与字节数到 manifest。 |
| replaceCargoLockPackageVersion | 函数 | 268–299 | 简单 | versioning、source-edit、host-bridge | 0 | 同步替换 Cargo.lock 中对应包的版本条目。 |
| replaceCargoPackageVersion | 函数 | 251–266 | 简单 | versioning、source-edit、host-bridge | 0 | 替换 Cargo.toml 中的 package 版本。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [check-host-bridge-cli-prebuild-freshness.mjs](check-host-bridge-cli-prebuild-freshness.mjs.md) | scripts/host-bridge/check-host-bridge-cli-prebuild-freshness.mjs | Host Bridge CLI 预构建新鲜度检查：比对 Cargo 源码构建指纹、已发布 release manifest 与 addon/bin 下各平台二进制 sha256 是否一致。 |
| [prebuild-zotero-bridge-cli.ts](prebuild-zotero-bridge-cli.ts.md) | scripts/host-bridge/prebuild-zotero-bridge-cli.ts | Host Bridge CLI 预构建的 CLI 入口：锁定发布身份并校验源码状态，派发七平台预构建工作流、下载产物并同步回本地预构建树。 |
| [sync-host-bridge-cli-prebuilds.ts](sync-host-bridge-cli-prebuilds.ts.md) | scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts | Host Bridge CLI 预构建同步核心：校验 prebuild result 身份、用内置 zlib 解压并核对 zip 条目、原子替换预构建树与两份 manifest，失败时回滚已改动文件。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| bumpHostBridgeCliPatchVersion | 函数 | 347–397 | 执行 patch 版本提升并同步 Cargo.toml、Cargo.lock 与 manifest。 |
| bumpMinorVersion | 函数 | 243–249 | 递增 semver 的 minor 段并重置 patch。 |
| bumpPatchVersion | 函数 | 235–241 | 递增 semver 的 patch 段。 |
| computeHostBridgeCliBuildFingerprint | 函数 | 201–215 | 汇总全部输入文件计算稳定的 CLI 构建指纹。 |
| [getHostBridgeCliReleaseStatus](../../../symbols/scripts/host-bridge/host-bridge-cli-release-governance.mjs/getHostBridgeCliReleaseStatus.md) | 函数 | 328–345 | 汇总当前发布状态：版本、构建指纹与预构建缺口。 |
| isHostBridgeCliBuildInputPath | 函数 | 119–125 | 判断某路径是否属于参与构建指纹的输入文件。 |
| normalizeCargoLockForFingerprint | 函数 | 144–175 | 归一化 Cargo.lock，使依赖解析顺序不影响构建指纹。 |
| normalizeCargoTomlForFingerprint | 函数 | 127–142 | 归一化 Cargo.toml，消除与构建无关的排版变动。 |
| readCargoPackageVersion | 函数 | 217–233 | 从 Cargo.toml 中读取 package 版本。 |
| readHostBridgeCliBuildRecipe | 函数 | 15–54 | 读取并校验 CLI 构建配方，要求恰好声明七个 target 与完整工具链。 |
| [readHostBridgeCliReleaseManifest](../../../symbols/scripts/host-bridge/host-bridge-cli-release-governance.mjs/readHostBridgeCliReleaseManifest.md) | 函数 | 316–318 | 读取仓库中的 Host Bridge CLI release manifest。 |
| recordHostBridgeCliBinaryChecksums | 函数 | 411–468 | 逐一登记七平台预构建二进制的 sha256 与字节数到 manifest。 |
| replaceCargoLockPackageVersion | 函数 | 268–299 | 同步替换 Cargo.lock 中对应包的版本条目。 |
| replaceCargoPackageVersion | 函数 | 251–266 | 替换 Cargo.toml 中的 package 版本。 |
