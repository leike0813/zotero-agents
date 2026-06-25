# ホスト API リファレンス

`runtime.hostApi` は Workflow フックが Zotero と対話するための主要なインタフェースである。Zotero ライブラリ、アイテム、ファイルシステム、設定などの完全な操作機能をカプセル化する。

## アイテム操作（hostApi.items）

```ts
hostApi.items = {
  get: (ref) => Zotero.Item | null,          // 参照でアイテムを取得
  resolve: (ref) => Zotero.Item,             // get と同じだが、アイテムが存在しない場合はエラーをスロー
  getByLibraryAndKey: (libraryID, key) => Zotero.Item | null,  // ライブラリ ID + Key で取得
  getAll: () => Promise<Zotero.Item[]>,      // 全アイテムを取得
}
```

`ref` は `Zotero.Item` オブジェクト、数値 ID、または文字列 Key を指定できる。

**例：**

```js
// ID でアイテムを取得
const item = hostApi.items.get(12345);

// ライブラリ Key でアイテムを取得
const item = hostApi.items.getByLibraryAndKey(1, "ABCD1234");
```

## コンテキスト（hostApi.context）

```ts
hostApi.context = {
  getCurrentView: () => ZoteroHostCurrentViewDto,  // 現在のアクティブビュー情報
  getSelectedItems: () => ZoteroHostItemSummaryDto[],  // 現在選択されているアイテムリスト
}
```

**例：**

```js
const view = hostApi.context.getCurrentView();
// { libraryID: 1, selectedItems: [...], ... }

const selected = hostApi.context.getSelectedItems();
// [{ id, key, libraryID, title, ... }, ...]
```

## ライブラリ操作（hostApi.library）

```ts
hostApi.library = {
  listItems: (args) => Promise<LibraryListResponse>,       // ページネーション付きアイテムリスト
  searchItems: (args) => Promise<ItemSummaryDto[]>,        // アイテムを検索
  getItemDetail: (ref) => Promise<ItemDetailDto | null>,   // アイテムの詳細情報を取得
  getItemNotes: (ref, args?) => Promise<NoteDto[]>,        // アイテムのノートリストを取得
  getNoteDetail: (ref, args?) => Promise<NoteDetailChunkDto>, // ノート本文を取得
  listNotePayloads: (ref) => Promise<NotePayloadDto[]>,    // ノートの埋め込み payload を一覧
  getNotePayload: (ref, args?) => Promise<NotePayloadDto>, // 特定の payload を取得
  getItemAttachments: (ref) => Promise<AttachmentDto[]>,   // アイテムの添付ファイルリストを取得
}
```

**例：**

```js
// アイテムを検索
const results = await hostApi.library.searchItems({
  query: "transformer",
  limit: 10,
});

// アイテムのノートを取得
const notes = await hostApi.library.getItemNotes(ref);

// アイテムの添付ファイルを取得
const attachments = await hostApi.library.getItemAttachments(ref);
```

## ミューテーション操作（hostApi.mutations）

Zotero のデータの作成、更新、削除に使用される。書き込み操作にはユーザーの承認が必要である（Zotero UI で確認される）。

```ts
hostApi.mutations = {
  preview: (request) => Promise<MutationPreviewResponse>,   // ミューテーションの効果をプレビュー
  execute: (request) => Promise<MutationExecuteResponse>,   // ミューテーションを実行
}
```

### サポートされるミューテーション操作

| `operation` | 目的 | 説明 |
|-------------|------|------|
| `item.updateFields` | アイテムフィールドの更新 | タイトル、著者、日付などのフィールドを変更 |
| `item.addTags` | タグの追加 | アイテムに1つ以上のタグを追加 |
| `item.removeTags` | タグの削除 | アイテムから指定されたタグを削除 |
| `note.createChild` | 子ノートの作成 | 親アイテムの下に新しいノートを作成 |
| `note.update` | ノートの更新 | 既存ノートの内容を変更 |
| `note.upsertPayload` | 埋め込み payload の更新 | ノートの Workflow payload 添付ファイルを更新 |
| `literature.ingest` | 文献の取り込み | 論文を Zotero にインポート |
| `collection.addItems` | コレクションへの追加 | アイテムをコレクションに追加 |
| `collection.removeItems` | コレクションからの削除 | アイテムをコレクションから削除 |

**例：ノートの作成**

```js
const result = await hostApi.mutations.execute({
  operation: "note.createChild",
  parentItem: parentItem.getField("id"),
  data: {
    content: htmlContent,
    tags: ["generated"],
  },
});
```

**例：タグの追加**

```js
await hostApi.mutations.execute({
  operation: "item.addTags",
  item: itemId,
  data: { tags: ["field:computer_science", "method:deep_learning"] },
});
```

## ノート操作（hostApi.notes）

```ts
hostApi.notes = {
  // ... 低レベルノートハンドラの全メソッド
  importEmbeddedImage: (noteRef, image) => Promise<{
    attachmentKey: string;
    attachmentItem: Zotero.Item;
    mimeType: string;
    bytes: number;
  }>,
}
```

### 画像処理（hostApi.images）

```ts
hostApi.images = {
  prepareForNoteEmbedding: (source, options?) => Promise<PreparedNoteImage>,
}
```

ノートに埋め込むのに適した形式に画像を処理するために使用される。

```js
const prepared = await hostApi.images.prepareForNoteEmbedding(filePath, {
  maxLongEdge: 720,
  targetBytes: 180 * 1024,
});

const result = await hostApi.notes.importEmbeddedImage(noteRef, prepared);
```

## 添付ファイル操作（hostApi.attachments）

```ts
hostApi.attachments = {
  // 低レベル添付ファイルハンドラの全メソッド
  // 含む：添付ファイルの一覧、パスの取得、添付ファイルの作成など
}
```

## タグ操作（hostApi.tags）

```ts
hostApi.tags = {
  // 低レベルタグハンドラの全メソッド
  // 含む：タグの一覧、タグの取得、タグの作成など
}
```

## コレクション操作（hostApi.collections）

```ts
hostApi.collections = {
  // 低レベルコレクションハンドラの全メソッド
  // 含む：コレクションの一覧、サブコレクションの取得など
}
```

## ファイル操作（hostApi.file）

```ts
hostApi.file = {
  readText: (path) => Promise<string>,                    // テキストファイルを読み取り
  writeText: (path, content) => Promise<void>,            // テキストファイルを書き込み
  readBytes: (path) => Promise<Uint8Array>,               // バイナリファイルを読み取り
  writeBytes: (path, bytes) => Promise<void>,             // バイナリファイルを書き込み
  copy: (source, target) => Promise<void>,                // ファイルをコピー
  exists: (path) => Promise<boolean>,                     // ファイルの存在を確認
  makeDirectory: (path) => Promise<void>,                 // ディレクトリを作成（親ディレクトリを含む）
  pathToFile: (path) => nsIFile,                          // パスを Zotero ファイルオブジェクトに変換
  getTempDirectoryPath: () => string,                     // テンポラリディレクトリパスを取得
  pickDirectory: (args?) => Promise<string | null>,       // ディレクトリセレクタを開く
  pickFile: (args?) => Promise<string | null>,            // ファイルセレクタを開く
  pickFiles: (args?) => Promise<string[] | null>,         // 複数ファイルセレクタを開く
}
```

**例：**

```js
// ファイルを読み取り
const content = await hostApi.file.readText("/path/to/file.md");

// ファイルを書き込み
await hostApi.file.writeText("/path/to/output.md", newContent);

// ディレクトリセレクタを開き、ユーザーにエクスポートディレクトリを選択させる
const dir = await hostApi.file.pickDirectory({
  title: "Select Export Directory",
});
if (dir) {
  // ユーザーがディレクトリを選択
  await hostApi.file.writeText(`${dir}/result.md`, content);
}
```

## 設定（hostApi.prefs）

```ts
hostApi.prefs = {
  get: (key, global?) => unknown,      // 設定を読み取り
  set: (key, value, global?) => void,  // 設定を書き込み
  clear: (key, global?) => void,       // 設定をクリア
}
```

プレフィックスはプラグインによって自動的に処理されるため、キー名を渡すだけでよい。

**例：**

```js
// 設定を読み取り
const vocab = hostApi.prefs.get("tagVocabularyJson");

// 設定を書き込み
hostApi.prefs.set("mySetting", "myValue");
```

## UI 通知（hostApi.notifications）

```ts
hostApi.notifications = {
  toast: ({ text, type? }) => void,
}
// type: "default" | "success" | "error"
```

**例：**

```js
hostApi.notifications.toast({
  text: "Processing complete!",
  type: "success",
});
```

## ランタイムロギング（hostApi.logging）

```ts
hostApi.logging = {
  appendRuntimeLog: (input) => void,
}
```

ランタイムロガーに診断情報を追加するために使用される。

## プラグイン設定（hostApi.addon）

```ts
hostApi.addon = {
  getConfig: () => ({ addonName, addonRef, prefsPrefix }),
}
```

## API バージョン（hostApi.version）

```ts
hostApi.version: number
```

現在のホスト API バージョン番号。プラグインバージョン間の互換性が必要なフックを書く際に、破壊的変更に対するガードとして使用する。

## 親アイテム操作（hostApi.parents）

```ts
hostApi.parents = {
  // 低レベル親アイテムハンドラの操作
}
```

親アイテム管理への低レベルアクセスを提供する。低レベルハンドラインタフェースが必要でない限り、`hostApi.library` と `hostApi.mutations` の使用を推奨する。

## コマンド操作（hostApi.command）

```ts
hostApi.command = {
  // 低レベルコマンドハンドラの操作
}
```

コマンド実行のための低レベルインタフェース。通常 Workflow フックでは不要。

## エディタ操作（hostApi.editor）

```ts
hostApi.editor = {
  openSession: (args) => ReturnType<typeof openWorkflowEditorSession>,
  registerRenderer: (rendererId, renderer) => void,
  unregisterRenderer: (rendererId) => void,
}
```

Workflow エディタセッションを管理する。`registerRenderer` と `unregisterRenderer` は Workflow 固有の出力フォーマットに対するカスタムレンダラーを可能にする。

## 合成操作（hostApi.synthesis）

```ts
hostApi.synthesis?: SynthesisService
```

Synthesis Workbench サービス（トピック、コンセプト、タグ、引用グラフなど）へのアクセスを提供する。Synthesis システムが初期化されている場合にのみ利用可能。

## 完全な例

```js
export async function applyResult({ parent, bundleReader, runtime }) {
  const { hostApi, helpers } = runtime;

  // 1. 親アイテムを解決
  const parentItem = helpers.resolveItemRef(parent);

  // 2. バンドルからアーティファクトを読み取り
  const markdownContent = await bundleReader.readText("result/output.md");

  // 3. HTML ノートに変換
  const htmlContent = helpers.toHtmlNote("Processing Result", markdownContent);

  // 4. ノートを作成
  const noteResult = await hostApi.mutations.execute({
    operation: "note.createChild",
    parentItem: parentItem.getField("id"),
    data: { content: htmlContent },
  });

  // 5. タグを追加
  await hostApi.mutations.execute({
    operation: "item.addTags",
    item: parentItem.getField("id"),
    data: { tags: ["processed"] },
  });

  // 6. ユーザーに通知
  hostApi.notifications.toast({
    text: `Processing complete: ${parentItem.getField("title")}`,
    type: "success",
  });

  return { applied: true, noteId: noteResult.id };
}
```

## 次のステップ

- [パッケージングとデプロイ](packaging) — カスタム Workflow を公開する
- [デバッグとテスト](debugging) — Workflow の正しさを検証する
