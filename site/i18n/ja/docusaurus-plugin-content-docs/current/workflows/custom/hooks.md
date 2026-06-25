# フックシステム

フックはワークフローの拡張ポイントです——ワークフロー実行の各段階で、プラグインのワークフローランタイムが対応するフックスクリプトを呼び出し、JavaScriptで実行フローを制御できます。

ワークフローには最大 **3つのフック** を含めることができ、`applyResult` のみが必須です。

> **入力フィルタリングについて：** 古い `filterInputs` フックは宣言的な `validateSelection` メカニズムに置き換えられました。JavaScriptなしで入力制約を定義するには `workflow.json` で `validateSelection` を使用してください。詳細は [マニフェストファイルの作成](manifest#selection-validation) を参照。

## フックスクリプトの構造

各フックスクリプトは `.mjs`（ES Module）ファイルで、名前付き関数をエクスポートします：

```js
// hooks/buildRequest.mjs
export function buildRequest({ selectionContext, manifest, executionOptions, runtime }) {
  // 実装ロジック
  return requestSpec;
}
```

## ランタイムコンテキスト (runtime)

すべてのフックは `runtime` パラメータを受け取り、Zoteroや様々なツールへの直接アクセスを提供します。

```js
runtime = {
  zotero,           // Zotero グローバルオブジェクト
  handlers,         // 低レベルデータ処理ハンドラ
  hostApi,          // 高レベルホストAPI（推奨）
  helpers,          // フック補助ユーティリティ関数
  addon,            // プラグイン設定

  workflowId,       // 現在のワークフローID
  workflowRootDir,  // workflow.jsonを含むディレクトリの絶対パス
  workflowSourceKind, // "official" | "dev-local" | "user" | ""
  packageId,        // 所属パッケージID（パッケージ内でのみ利用可能）
  packageRootDir,   // パッケージルートディレクトリの絶対パス

  hostApiVersion,   // ホストAPIバージョン番号
  hookName,         // 現在のフック名: "buildRequest" | "applyResult" | ""
  debugMode,        // デバッグモードかどうか

  fetch,            // グローバルfetch（利用可能な場合）
  Buffer,           // Node.js Buffer（利用可能な場合）
  btoa,             // Base64エンコード（利用可能な場合）
  atob,             // Base64デコード（利用可能な場合）
  TextEncoder,      // テキストエンコーダ（利用可能な場合）
  TextDecoder,      // テキストデコーダ（利用可能な場合）
  FileReader,       // ファイルリーダー（利用可能な場合）
  navigator,        // Navigatorオブジェクト（利用可能な場合）
}
```

## 1. buildRequest — リクエストの構築

`workflow.json` の宣言的な `request` では不十分な場合、`buildRequest` を使用してリクエストペイロードを動的に構築します。

**シグネチャ：**

```ts
function buildRequest({
  selectionContext,  // フィルタリング後の選択コンテキスト
  manifest,         // workflow.json
  executionOptions, // { workflowParams, providerOptions }
  runtime,          // ランタイムコンテキスト
}): unknown
```

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

## 2. normalizeSettings — パラメータの正規化

設定の永続化前または実行前にパラメータを正規化します。

```ts
function normalizeSettings(args: {
  phase: "persisted";
  workflowId: string;
  manifest: WorkflowManifest;
  previous: { backendId?, workflowParams?, providerOptions? };
  incoming: { backendId?, workflowParams?, providerOptions? };
  merged: { backendId?, workflowParams?, providerOptions? };
} | {
  phase: "execution";
  workflowId: string;
  manifest: WorkflowManifest;
  rawWorkflowParams: Record<string, unknown>;
  normalizedWorkflowParams: Record<string, unknown>;
}): unknown
```

## 3. applyResult — 結果の処理（必須）

ワークフローの**唯一の必須フック**で、バックエンドの実行結果をZoteroに書き込みます。

```ts
function applyResult({
  parent,           // 親Zoteroアイテム
  bundleReader,     // 結果バンドルリーダー
  resultContext,    // 構造化結果コンテキスト
  sequenceStep,     // シーケンスステップメタデータ
  productStorage,   // アーティファクトストレージAPI
  request,          // 送信された元のリクエスト
  runResult,        // 実行結果メタデータ
  manifest,         // workflow.json
  runtime,          // ランタイムコンテキスト
}): unknown
```

## フックヘルパー関数 (helpers)

| 関数 | 説明 |
|------|------|
| `getAttachmentParentId(entry)` | 添付ファイルの親アイテムIDを取得 |
| `getAttachmentFilePath(entry)` | 添付ファイルのローカルファイルパスを取得 |
| `getAttachmentFileName(entry)` | 添付ファイル名を取得 |
| `getAttachmentFileStem(entry)` | 拡張子なしの添付ファイル名を取得 |
| `getAttachmentDateAdded(entry)` | 添付ファイルのdateAddedタイムスタンプを取得 |
| `basenameOrFallback(path, fallback)` | ベース名を抽出するかフォールバック文字列を返す |
| `isMarkdownAttachment(entry)` | Markdown添付かどうか |
| `isPdfAttachment(entry)` | PDF添付かどうか |
| `pickEarliestPdfAttachment(entries)` | 最も古いPDFを選択 |
| `cloneSelectionContext(ctx)` | 選択コンテキストのディープコピー |
| `withFilteredAttachments(ctx, items)` | 指定された添付ファイルのみを保持 |
| `resolveItemRef(ref)` | アイテム参照をZotero.Itemに解決 |
| `toHtmlNote(title, body)` | MarkdownをHTMLノートに変換 |
| `normalizeReferenceAuthors(value)` | 著者リストを正規化 |
| `normalizeReferenceEntry(entry, index)` | 単一の参照エントリを正規化 |
| `normalizeReferencesArray(value)` | 参照配列を正規化 |
| `normalizeReferencesPayload(payload)` | 参照ペイロードを正規化 |
| `replacePayloadReferences(payload, refs)` | ペイロード内の参照を置換 |
| `resolveReferenceSource(entry)` | 参照のソースを解決 |
| `renderReferenceLocator(entry)` | 巻/号/ページのロケータ文字列をレンダリング |
| `renderReferencesTable(references)` | 参照をHTMLテーブルとしてレンダリング |
