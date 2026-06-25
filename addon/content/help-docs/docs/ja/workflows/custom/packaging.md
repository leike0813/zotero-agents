# パッケージングとデプロイ

Workflow は**単一の Workflow** と**マルチ Workflow パッケージ**の2つの形式に対応している。単一の Workflow はシンプルな用途に適し、マルチ Workflow パッケージは共通コードを共有する Workflow 群の管理に適している。

## 単一の Workflow

最もシンプルな形式: `workflow.json` とそのフックスクリプトを含むディレクトリである。

```
my-workflow/
├── workflow.json
└── hooks/
    ├── filterInputs.mjs
    └── applyResult.mjs
```

単一の Workflow には `packageId` がなく、フックスクリプト間で相対インポートによるコード共有はできない。

## マルチ Workflow パッケージ

複数の Workflow がロジックを共有する場合、パッケージとしてまとめることができる。

```
my-package/
├── workflow-package.json       # Package manifest
├── lib/                        # Shared code
│   └── runtime.mjs
│   └── util.mjs
├── workflow-a/
│   ├── workflow.json
│   └── hooks/
│       ├── filterInputs.mjs
│       └── applyResult.mjs
├── workflow-b/
│   ├── workflow.json
│   └── hooks/
│       └── applyResult.mjs
└── locales/                    # Package-level localization files
    ├── zh-CN.json
    └── ja-JP.json
```

### workflow-package.json

```json
{
  "id": "my-package",
  "version": "1.0.0",
  "workflows": [
    "workflow-a/workflow.json",
    "workflow-b/workflow.json"
  ],
  "i18n": {
    "defaultLocale": "en-US",
    "locales": {
      "zh-CN": "locales/zh-CN.json",
      "ja-JP": "locales/ja-JP.json"
    }
  }
}
```

### パッケージ内のコード共有

パッケージ内のフックスクリプトは、`lib/` 以下の共有モジュールを相対パスでインポートできる。

```js
// workflow-a/hooks/applyResult.mjs
import { processResult } from "../../lib/util.mjs";

export async function applyResult({ parent, bundleReader, runtime }) {
  return processResult({ parent, bundleReader, runtime });
}
```

```js
// lib/util.mjs
export function processResult({ parent, bundleReader, runtime }) {
  // Shared processing logic
}
```

注意: フックスクリプトは ES Module として実行され、`import` 文がサポートされるが、インポートパスはフックファイル自体からの相対パスでなければならない。

## デプロイ方法

### ユーザー Workflow ディレクトリ

Zotero の環境設定で設定された **Workflow ディレクトリ** の下に Workflow ディレクトリを配置する。Workflow マネージャがこのディレクトリ（サブディレクトリを含む）を自動的にスキャンし、すべての `workflow.json` を検出する。

設定場所: Zotero → 設定 → Zotero Agents → Workflow ディレクトリ。

### ディレクトリスキャンルール

- Workflow マネージャは Workflow ディレクトリとそのサブディレクトリを**再帰的にスキャン**する
- `workflow.json` が見つかると Workflow として登録される
- パッケージディレクトリ内で `workflow-package.json` が見つかった場合、サブ Workflow はパッケージモードで読み込まれる
- Workflow ディレクトリが存在しないか有効な Workflow を含まない場合、Workflow マネージャは警告を出力するがプラグインの動作には影響しない

### 他の形式との互換性

| 保存場所 | 可視性 | 説明 |
|---------|--------|------|
| 公式 Workflow パッケージ `content/official/workflows/` | 全ユーザー | コンテンツフィード経由で個別にインストールされる。ユーザーが直接変更することはできない |
| ユーザー Workflow ディレクトリ | 現在のユーザー | 自由に追加・修正・削除できる |
| 公式 + ユーザーディレクトリ | 統合表示 | 両方の場所の Workflow がダッシュボードに並んで表示される |

## 検証

Workflow をユーザーディレクトリにデプロイした後は以下を確認する。

1. **ダッシュボードを再度開く**。新しい Workflow がホーム画面の Workflow 一覧に表示されるはずである
2. 対象のアイテムを選択した状態で右クリック → Zotero Agents を選択すると、新しい Workflow が表示されるはずである
3. Workflow を実行する前に、設定ダイアログのパラメータが正しいことを確認する

## 次のステップ

- [ローカライズ](#doc/workflows%2Fcustom%2Flocalization) — Workflow に多言語対応を追加する
- [リクエスト種別](#doc/workflows%2Fcustom%2Frequest-kinds) — 適切な実行バックエンドとリクエストタイプを選択する
- [デバッグとテスト](#doc/workflows%2Fcustom%2Fdebugging) — Workflow の正当性を検証する
