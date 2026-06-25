# 選択コンテキスト

ユーザーが Zotero でアイテムを選択すると、プラグインは構造化された**選択コンテキスト（SelectionContext）**を構築する。これはユーザーが何を選択したか、および各選択アイテムがどの種別に属するかを記述する。このコンテキストは `buildRequest` フックの入力基盤として機能する。

## 選択種別

選択されたアイテム種別の組み合わせに基づき、`selectionContext.selectionType` は以下のいずれかの値を返す。

| 種別 | 説明 |
|------|------|
| `"parent"` | すべての選択アイテムが親アイテム（トップレベルアイテム） |
| `"child"` | すべての選択アイテムが子アイテム（非トップレベルアイテム） |
| `"attachment"` | すべての選択アイテムが添付ファイル |
| `"note"` | すべての選択アイテムがノート |
| `"mixed"` | 選択アイテムが複数の種別の混在 |
| `"none"` | アイテムが選択されていない |

## コンテキストの構造

```ts
selectionContext = {
  selectionType: "parent",       // 選択種別
  items: {
    parents: [ /* 親アイテムのリスト */ ],
    children: [ /* 子アイテムのリスト */ ],
    attachments: [ /* 添付ファイルのリスト */ ],
    notes: [ /* ノートのリスト */ ],
  },
  summary: {
    parentCount: 2,
    childCount: 0,
    attachmentCount: 0,
    noteCount: 0,
  },
  warnings: [],                  // 警告メッセージ
  sampledAt: "2026-01-15T...",   // コンテキスト作成日時
}
```

各アイテム種別には豊富なコンテキスト情報が含まれる。

### 親アイテム（ParentContext）

親アイテムは Zotero ライブラリ内のトップレベルアイテムである（例：学術論文、書籍、ウェブページなど）。各親アイテムコンテキストには以下が含まれる。

```ts
{
  item: Zotero.Item,         // アイテムオブジェクト
  id: number,                // アイテム ID
  title: string,             // タイトル
  attachments: [             // このアイテムの子添付ファイル
    { type, filePath, mimeType, dateAdded, ... }
  ],
  notes: [                   // このアイテムの子ノート
    { id, content, ... }
  ],
  tags: string[],            // タグリスト
  collections: string[],     // 含まれるコレクション
  children: [                // その他の子アイテム
    { id, type, ... }
  ],
}
```

### 添付ファイル（AttachmentContext）

添付ファイルはアイテムのファイル添付である（PDF、Markdown など）。各添付ファイルコンテキストには以下が含まれる。

```ts
{
  item: Zotero.Item,         // 添付ファイルアイテムオブジェクト
  id: number,                // アイテム ID
  filePath: string,          // ローカルファイルパス
  fileName: string,          // ファイル名
  mimeType: string,          // MIME タイプ（例："application/pdf"）
  dateAdded: Date,           // 追加日
  parentItem: {              // 所有者の親アイテム
    id: number,
    key: string,
    libraryID: number,
  },
  tags: string[],
  collections: string[],
}
```

### ノート（NoteContext）

```ts
{
  item: Zotero.Item,
  id: number,
  content: string,           // ノート内容（HTML）
  parentItem: { id, key, libraryID },
  tags: string[],
}
```

## フックでの選択コンテキストの利用

### 選択された添付ファイルの取得

```js
export function filterInputs({ selectionContext, runtime }) {
  const attachments = selectionContext.items.attachments;

  for (const attachment of attachments) {
    const filePath = runtime.helpers.getAttachmentFilePath(attachment);
    const fileName = runtime.helpers.getAttachmentFileName(attachment);
    // 添付ファイルを処理
  }

  return selectionContext;
}
```

### 選択された親アイテムとその子コンテンツの取得

```js
export function buildRequest({ selectionContext, runtime }) {
  const parents = selectionContext.items.parents;

  for (const parent of parents) {
    const title = parent.item.getField("title");
    const attachments = parent.attachments;  // この親アイテム配下の添付ファイル
    const notes = parent.notes;              // この親アイテム配下のノート
  }

  // ...
}
```

### 選択種別を確認して動作を決定する

```js
export function filterInputs({ selectionContext, runtime }) {
  const { selectionType } = selectionContext;

  if (selectionType === "none") {
    // アイテムが選択されていない。スキップ
    return null;
  }

  if (selectionType === "attachment") {
    // ユーザーが添付ファイルのみを選択。添付ファイル処理ロジックを使用
  } else if (selectionType === "parent") {
    // ユーザーが親アイテムのみを選択。最初の該当添付ファイルを展開
  }

  return selectionContext;
}
```

### 添付ファイルのフィルタリング

`helpers.withFilteredAttachments` を使用して、処理後に選択コンテキストを更新する。

```js
export function filterInputs({ selectionContext, runtime }) {
  const { helpers } = runtime;

  // PDF 添付ファイルのみを保持
  const pdfs = selectionContext.items.attachments.filter(
    a => helpers.isPdfAttachment(a)
  );

  // 全アイテムから PDF 添付ファイルを持つ親アイテムのみを保持
  const matched = selectionContext.items.parents.filter(parent => {
    return parent.attachments.some(
      a => helpers.isPdfAttachment(a)
    );
  });

  // 一致がない場合、実行をスキップ
  if (matched.length === 0) return null;

  // フィルタリング結果でコンテキストを更新
  return helpers.withFilteredAttachments(selectionContext, matched);
}
```

### アイテム未選択時の Workflow

`inputs.unit: "workflow"` かつ `trigger.requiresSelection: false` の場合、Workflow はアイテムを選択せずにトリガーできる。この場合、`selectionContext.selectionType` は `"none"` になり、`items` 内のすべての配列が空になる。このモードはグローバル操作の作成（例：「トピック合成の作成」）に適する。

## 宣言的な選択検証

Workflow が**すでに結果を持つアイテムをスキップする**、または**特定種の入力をフィルタリングする**だけであれば、`filterInputs` フックを書かずに宣言的な `validateSelection` フィールドを使用できる。

```json
{
  "validateSelection": {
    "select": { "policy": "literature-source" },
    "exclude": [
      { "kind": "generated-notes-all", "noteKinds": ["digest"] }
    ]
  }
}
```

完全なドキュメントは[マニフェストの作成](manifest#selection-validation)を参照。

> **選択のガイド：** 可能な限り宣言的な `validateSelection` を使用すること — JavaScript ゼロ、メンテナンスゼロで済む。複雑な選択ロジックは `buildRequest` フックで実装できる。

## 次のステップ

- [ホスト API リファレンス](host-api) — フックで Zotero データを操作する完全な API
- [マニフェストの作成](manifest) — Workflow の入力ユニット種別を定義する
