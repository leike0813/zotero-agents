# フックシステム

フックはワークフローの拡張ポイントです——ワークフロー実行の各段階で、プラグインのワークフローランタイムが対応するフックスクリプトを呼び出し、JavaScript で実行フローに介入し制御できます。

ワークフローには最大 **4つのフック** を含めることができ、そのうち `applyResult` のみが必須です。

> **入力フィルタリングについて：** 古い `filterInputs` フックは宣言的な `validateSelection` メカニズムに置き換えられました。JavaScript を書かずに入力制約を定義するには `workflow.json` で `validateSelection` を使用してください。詳細は [マニフェストファイルの作成](manifest#selection-validation) を参照。

## フックスクリプトの構造

各フックスクリプトは `.mjs`（ES Module）ファイルで、名前付き関数をエクスポートします：

```js
// hooks/buildRequest.mjs
export function buildRequest({ selectionContext, preflight, manifest, executionOptions, runtime }) {
  // 実装ロジック
  return requestSpec;
}
```

## ランタイムコンテキスト (runtime)

すべてのフックは `runtime` パラメータを受け取り、Zotero や様々なツールへの直接アクセスを提供します。

```js
runtime = {
  zotero,           // Zotero グローバルオブジェクト
  handlers,         // 低レベルデータ処理ハンドラ
  hostApi,          // 高レベルホスト API（推奨）
  helpers,          // フック補助ユーティリティ関数
  addon,            // プラグイン設定

  workflowId,       // 現在のワークフロー ID
  workflowRootDir,  // workflow.json を含むディレクトリの絶対パス
  workflowSourceKind, // "official" | "dev-local" | "user" | ""
  packageId,        // 所属パッケージ ID（ワークフローパッケージ内でのみ利用可能）
  packageRootDir,   // パッケージルートディレクトリの絶対パス

  hostApiVersion,   // ホスト API バージョン番号
  hookName,         // 現在のフック名: "preflight" | "buildRequest" | "applyResult" | ""
  debugMode,        // デバッグモードかどうか

  fetch,            // グローバル fetch（利用可能な場合）
  Buffer,           // Node.js Buffer（利用可能な場合）
  btoa,             // Base64 エンコード（利用可能な場合）
  atob,             // Base64 デコード（利用可能な場合）
  TextEncoder,      // テキストエンコーダ（利用可能な場合）
  TextDecoder,      // テキストデコーダ（利用可能な場合）
  FileReader,       // ファイルリーダー（利用可能な場合）
  navigator,        // Navigator オブジェクト（利用可能な場合）
}
```

**ベストプラクティス：** `runtime.hostApi`（高レベル API）を優先して使用し、`hostApi` で要件を満たせない場合にのみ `runtime.handlers` や `runtime.zotero` を使用してください。

## 1. buildRequest — リクエストの構築

`workflow.json` の宣言的な `request` では複雑なリクエストを記述しきれない場合、`buildRequest` を使用してリクエストペイロードを動的に構築します。

**シグネチャ：**

```ts
function buildRequest({
  selectionContext,  // フィルタリング後の選択コンテキスト
  preflight,         // オプションの preflight 計画/ユニット/コンテキスト
  manifest,         // workflow.json
  executionOptions, // { workflowParams, providerOptions }
  runtime,          // ランタイムコンテキスト
}): unknown
```

**宣言的リクエストとの関係：** `buildRequest` は `workflow.json` の `request` フィールドと相互排他です。両方が存在する場合、`buildRequest` が優先されます。

ワークフローが `hooks.preflight` を宣言している場合、ランタイムは正規化された preflight コンテキストを `preflight` として `buildRequest` に渡します。このコンテキストは `selectionContext` にマージされません。別個の実行計画メタデータとして扱ってください。

**例：パススルーリクエスト**

```js
export function buildRequest({ selectionContext, executionOptions, runtime }) {
  return {
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: executionOptions?.workflowParams || {},
  };
}
```

**例：Preflight ユニットコンテキストを使用するリクエスト**

```js
export async function buildRequest({ selectionContext, preflight, runtime }) {
  const selected = selectionContext.items.find((item) => item.kind === "attachment");
  if (!selected) throw new Error("Source attachment is required");
  const detail = await runtime.hostApi.library.getItemDetail(selected.ref);
  if (detail.kind !== "attachment" || detail.item.file.state !== "available") {
    throw new Error("Source attachment file is unavailable");
  }
  return {
    kind: "generic-http.steps.v1",
    file: {
      path: detail.item.file.path,
      page_ranges: preflight?.unit?.context?.page_ranges,
    },
  };
}
```

**例：マルチステップシーケンスリクエスト**

```js
export async function buildRequest({ selectionContext, executionOptions, runtime }) {
  const selected = selectionContext.items.find((item) => item.kind === "attachment");
  if (!selected) throw new Error("Source attachment is required");
  const detail = await runtime.hostApi.library.getItemDetail(selected.ref);
  if (detail.kind !== "attachment" || detail.item.file.state !== "available") {
    throw new Error("Source attachment file is unavailable");
  }
  const sourcePath = detail.item.file.path;
  const language = executionOptions?.workflowParams?.language || "en-US";

  return {
    kind: "skillrunner.sequence.v1",
    sequence: {
      steps: [
        {
          id: "step1",
          skill_id: "my-analysis-skill",
          mode: "auto",
          workspace: "new",
          parameter: { language, source_path: sourcePath },
        },
        {
          id: "step2",
          skill_id: "my-enrichment-skill",
          mode: "auto",
          workspace: "reuse-workflow",
          handoff: {
            bindings: [
              {
                kind: "value",
                source: "output_field_name",
                target: "/input/field_name",
                step: "step1",
              },
            ],
          },
        },
      ],
    },
  };
}
```

## 2. preflight — 実行の計画またはショートサーキット

`preflight` は宣言的な選択解決の後、`buildRequest` または宣言的リクエスト構築の前に実行されます。解決済みの入力ユニットを必要とするが、メニュー有効化判断には含めるべきでない軽量なローカル判断に使用します。

`preflight` は Zotero データを書き込んではならず、プロバイダーリクエストを構築してはならず、`validateSelection` を置き換えてはなりません。すべての Zotero 書き込みは依然として `applyResult` に属し、すべてのプロバイダーリクエストペイロードは依然として `buildRequest` またはマニフェストの `request` フィールドに属します。

**シグネチャ：**

```ts
function preflight({
  selectionContext,  // 解決済みの入力ユニットコンテキスト
  parent,            // 利用可能な場合、現在のユニットの親アイテム
  attachment,        // 利用可能な場合、現在のユニットの添付ファイルアイテム
  note,              // 利用可能な場合、現在のユニットのノートアイテム
  manifest,          // workflow.json
  executionOptions,  // { workflowParams, providerOptions }
  runtime,           // ランタイムコンテキスト
}): PreflightOutcome
```

**結果: Continue**

通常のリクエスト構築を続行し、オプションで計画コンテキストを添付します：

```js
export async function preflight({ parent }) {
  return {
    kind: "continue",
    context: {
      doi: parent?.DOI || "",
      source: "selected-parent",
    },
  };
}
```

`context` は `buildRequest` 内で `preflight.context` として、`applyResult` 内で `resultContext.preflight.context` として利用可能です。

**結果: Skip**

現在の入力ユニットのみをスキップします：

```js
export function preflight({ parent }) {
  if (!parent?.DOI) {
    return { kind: "skip", reason: "missing DOI" };
  }
  return { kind: "continue" };
}
```

すべての入力ユニットがスキップされた場合、プロバイダージョブを送信せずに実行が終了します。

**結果: Short-Circuit Apply**

プロバイダー実行をスキップし、標準の `applyResult` パスを直接呼び出します：

```js
export async function preflight({ parent, runtime }) {
  const metadata = await lookupMetadataLocally(parent?.DOI, runtime);
  if (!metadata) {
    return { kind: "continue" };
  }
  return {
    kind: "short-circuit-apply",
    apply: {
      result: { ok: true, source: "local-metadata", item: metadata },
      request: { kind: "local.metadata.preflight.v1" },
      runResult: { status: "success" },
    },
    context: { source: "local-metadata" },
  };
}
```

これはメタデータキュレーターのようなワークフローに有用です：信頼できる識別子検索がローカルで成功した場合、`applyResult` はバックエンドを呼び出さずに親アイテムを更新できます。検索が見つからないか品質が低い場合は `continue` を返し、`buildRequest` に通常のバックエンドリクエストを構築させます。

**結果: Replace Units**

解決済みの1つの入力ユニットを複数の仮想リクエストユニットに置き換えます：

```js
export function preflight({ attachment }) {
  const chunks = [
    { id: "part-1", order: 0, context: { page_ranges: "1-200" } },
    { id: "part-2", order: 1, context: { page_ranges: "201-360" } },
  ];
  return {
    kind: "replace-units",
    units: chunks,
  };
}
```

各仮想ユニットは通常の `buildRequest` パスを通過します。ユニット固有のコンテキストは `preflight.unit.context` で利用可能です。

**集約 Single Apply**

複数のプロバイダー結果を1回の最終 Zotero 書き込みにマージする必要がある分割入力ワークフローでは、集約計画を追加します：

```js
export function preflight() {
  return {
    kind: "replace-units",
    units: [
      { id: "part-1", order: 0, context: { page_ranges: "1-200" } },
      { id: "part-2", order: 1, context: { page_ranges: "201-360" } },
    ],
    aggregate: {
      id: "pdf-pages",
      mode: "single-apply",
      applyWhen: "all-succeeded",
      orderBy: "unit.order",
    },
  };
}
```

v1 では、集約 apply は `mode: "single-apply"`、`applyWhen: "all-succeeded"`、`orderBy: "unit.order"` のみをサポートします。子プロバイダージョブが収集され、すべての子が成功した後に `applyResult` が1回呼び出されます。いずれかの子が失敗した場合、部分的な集約 apply は実行されません。

## 3. normalizeSettings — パラメータの正規化

設定の永続化前または実行前にパラメータを正規化します。

**シグネチャ：** このフックはフェーズに応じて異なるパラメータを受け取ります：

```ts
function normalizeSettings(args: {
  // persisted フェーズ: パラメータが設定に保存される時
  phase: "persisted";
  workflowId: string;
  manifest: WorkflowManifest;
  previous: { backendId?, workflowParams?, providerOptions? };
  incoming: { backendId?, workflowParams?, providerOptions? };
  merged: { backendId?, workflowParams?, providerOptions? };
} | {
  // execution フェーズ: 実行前
  phase: "execution";
  workflowId: string;
  manifest: WorkflowManifest;
  rawWorkflowParams: Record<string, unknown>;
  normalizedWorkflowParams: Record<string, unknown>;
}): unknown
```

**ユースケース：**

- パラメータ間の相互検証（例：オプション A が特定の値に設定された場合、オプション B のデフォルト値を変更する）
- パラメータのダウングレード処理（例：古いパラメータを新しいバージョンに移行する）
- 実行前に無効な値をクリーンアップする

## 4. applyResult — 結果の処理（必須）

これはワークフローの**唯一の必須フック**で、バックエンドの実行結果を Zotero に書き込む責務を持ちます。

**シグネチャ：**

```ts
function applyResult({
  parent,           // 親 Zotero アイテム
  bundleReader,     // 結果バンドルリーダー
  resultContext,    // preflight/集約メタデータを含む構造化結果コンテキスト
  sequenceStep,     // シーケンスステップメタデータ（シーケンス実行時に存在）
  productStorage,   // アーティファクトストレージ API
  request,          // 送信された元のリクエスト
  runResult,        // 実行結果メタデータ
  manifest,         // workflow.json
  runtime,          // ランタイムコンテキスト
}): unknown

// sequenceStep の形状:
// {
//   id: string;           // ステップ ID
//   index: number;        // シーケンス内のゼロベースインデックス
//   workflowId: string;   // このステップのサブワークフロー ID
//   skillId: string;      // このステップで実行されたスキル ID
//   finalStep: boolean;   // 最終ステップかどうか
//   phase: "sequence-step";
// }
```

`preflight` が宣言されている場合、`resultContext.preflight` は現在の apply 呼び出しの実行計画、ユニット ID、ユニットコンテキスト、共有コンテキストを公開します。`selectionContext` は preflight によって変更されません。

`replace-units` が `aggregate.single-apply` を使用する場合、`resultContext.aggregate.children` には順序付けられた子の結果が含まれます：

```ts
resultContext.aggregate.children = [
  {
    unitId: "part-1",
    order: 0,
    request,
    runResult,
    resultContext,
    bundleReader,
  },
  {
    unitId: "part-2",
    order: 1,
    request,
    runResult,
    resultContext,
    bundleReader,
  },
];
```

集約 `applyResult` は各子バンドルを `child.bundleReader` から読み取り、アーティファクトを順序通りにマージし、最終的な Zotero 結果を1回だけ書き込む必要があります。例えば、MinerU スタイルのワークフローでは、1つの PDF を複数の `page_ranges` ジョブとして送信し、`full.md` ファイルをマージして画像パスを名前空間化した後、1つの最終 Markdown 添付ファイルを作成できます。

**bundleReader の使用：**

```js
// アーティファクト ZIP バンドル内のファイルを読み取る
const digestMd = await bundleReader.readText("artifacts/digest.md");

// 展開されたアーティファクトディレクトリのパスを取得する
const extractedDir = await bundleReader.getExtractedDir();
```

**例：バンドルからノートを書き込む**

```js
export async function applyResult({ parent, bundleReader, runtime }) {
  if (!parent) return { applied: false };

  const parentItem = runtime.helpers.resolveItemRef(parent);
  const digestMd = await bundleReader.readText("artifacts/digest.md");

  const htmlContent = runtime.helpers.toHtmlNote("Paper Digest", digestMd);
  const newNote = await runtime.hostApi.mutations.execute({
    operation: "note.createChild",
    parentItem: parentItem.getField("id"),
    data: { content: htmlContent },
  });

  return { applied: true, noteId: newNote.id };
}
```

**例：バンドルからファイルをディスクに展開する（MinerU スタイル）**

```js
export async function applyResult({ parent, bundleReader, runtime }) {
  if (!parent) return { applied: false };

  const extractedDir = await bundleReader.getExtractedDir();
  const { file } = runtime.hostApi;

  const mdContent = await bundleReader.readText("full.md");
  const targetPath = `/path/to/output.md`;
  await file.writeText(targetPath, mdContent);

  return { applied: true, output_path: targetPath };
}
```

## フックヘルパー関数 (helpers)

`runtime.helpers` は以下の補助関数を提供します：

| 関数 | 説明 |
|------|------|
| `basenameOrFallback(path, fallback)` | ベース名を抽出するかフォールバック文字列を返す |
| `resolveItemRef(ref)` | アイテム参照を Zotero.Item に解決 |
| `toHtmlNote(title, body)` | Markdown を HTML ノート内容に変換 |
| `normalizeReferenceAuthors(value)` | 参照の著者リストを正規化 |
| `normalizeReferenceEntry(entry, index)` | 単一の参照エントリを正規化 |
| `normalizeReferencesArray(value)` | 参照の配列を正規化 |
| `normalizeReferencesPayload(payload)` | 参照ペイロードオブジェクトを正規化 |
| `replacePayloadReferences(payload, refs)` | ペイロード内の参照を置換 |
| `resolveReferenceSource(entry)` | 参照のソースフィールドを解決 |
| `renderReferenceLocator(entry)` | 巻/号/ページのロケータ文字列をレンダリング |
| `renderReferencesTable(references)` | 参照を HTML テーブルとしてレンダリング |

## 次のステップ

- [選択コンテキスト](selection-context) — selectionContext の詳細な構造
- [ホスト API リファレンス](host-api) — 完全な API リファレンス
- [パッケージングとデプロイ](packaging) — ワークフローのパッケージ化とデプロイ方法
