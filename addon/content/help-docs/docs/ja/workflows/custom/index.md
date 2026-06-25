# カスタム Workflow アーキテクチャ概要

Zotero Agents の Workflow システムは**プラガブルアーキテクチャ**を採用している。各 Workflow は独立した自己完結型のディレクトリであり、必須なのは `workflow.json` マニフェストファイルと対応するフックスクリプトのみである。プラグインの Workflow Manager が自動的に検出して読み込む。

## ディレクトリ構造

Workflow は2箇所に保存できる。

| 場所 | 種別 | 説明 |
|------|------|------|
| Official Workflow Package | Official | Content Feed 経由で個別にインストールされる。`<Zotero Data>/zotero-agents/content/official/workflows/` に配置される |
| ユーザー Workflow ディレクトリ | Custom | 設定で指定する。Workflow Manager が自動的にスキャンする |

プラグインの **Workflow Manager** は、Official Package ディレクトリとユーザー Workflow ディレクトリを再帰的にスキャンし、`workflow.json` ファイルを検出して利用可能な Workflow として登録する。

## 最小 Workflow の例

カスタム Workflow の作成には**2ファイル**だけが必要である。

```
my-workflow/
├── workflow.json
└── hooks/
    └── applyResult.mjs
```

### workflow.json

```json
{
  "id": "hello-world",
  "label": "Hello World",
  "provider": "pass-through",
  "inputs": {
    "unit": "parent"
  },
  "hooks": {
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

### hooks/applyResult.mjs

```js
export function applyResult({ parent, runtime }) {
  const title = runtime.helpers.resolveItemRef(parent).getField("title");
  runtime.hostApi.notifications.toast({
    text: `Hello, ${title}!`,
    type: "success",
  });
  return { greeted: true };
}
```

`my-workflow/` をユーザー Workflow ディレクトリに配置した後、Dashboard を開き直すと Workflow が表示される。

## Workflow アーキテクチャの階層

Workflow のライフサイクルは以下の階層で構成される。

```
User Action (Right-click / Dashboard)
    │
    ▼
Workflow Manager — Discover, load, validate
    │
    ├── Inputs — What items did the user select?
    ├── Parameters — What parameters did the user set?
    ├── Hooks — Preprocessing, request building, result handling
    └── Execution — Dispatched to a backend by the Provider
         │
         ▼
      Provider (SkillRunner / ACP / Generic HTTP / Pass-through)
         │
         ▼
      Backend — Remote or local execution engine
```

## Workflow パターンの分類

実行方法とバックエンドの種別に基づき、Workflow は以下のように分類される。

| パターン | 代表的な用途 | バックエンド種別 |
|----------|-------------|----------------|
| **pass-through** | 純粋なローカル操作（エクスポート、ファイル処理）。リモートバックエンド不要 | なし |
| **skillrunner.job.v1** | SkillRunner に送信する単一ステップの Skill 実行 | skillrunner / acp |
| **skillrunner.sequence.v1** | 複数ステップの連鎖的な Skill 実行。ステップ間でリレーを行う | acp |
| **generic-http.request.v1** | 単一の HTTP API 呼び出し | generic-http |
| **generic-http.steps.v1** | 複数ステップの HTTP API 呼び出し | generic-http |

## workflow.json の基本概念

```json
{
  "id": "unique identifier",
  "label": "display name",
  "provider": "backend type",
  "inputs": { "unit": "input unit type" },
  "parameters": { /* 設定可能なパラメータ */ },
  "execution": { /* 実行制御 */ },
  "request": { "kind": "リクエスト種別" },
  "hooks": { "applyResult": "結果処理用スクリプトパス" }
}
```

次のページで各フィールドの意味と使い方を詳しく説明する。

## 次のステップ

- [Workflow マニフェストの作成](#doc/workflows%2Fcustom%2Fmanifest) — workflow.json の各フィールドの詳細説明
- [フックシステム](#doc/workflows%2Fcustom%2Fhooks) — 各段階のフックの書き方
- [パラメータシステム](#doc/workflows%2Fcustom%2Fparameters) — 設定可能なパラメータの定義
