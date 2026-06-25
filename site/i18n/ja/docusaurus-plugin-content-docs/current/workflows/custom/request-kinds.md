# リクエスト種別

Workflow は `request.kind` を宣言することで、どの Provider（実行エンジン）がリクエストを処理するかを決定する。システムには複数のビルトインリクエスト種別があり、それぞれ異なるバックエンドと実行モードに対応する。

## リクエスト種別一覧

| `kind` | 対応 Provider | 説明 |
|--------|--------------|------|
| `pass-through.run.v1` | pass-through | 純粋なローカル実行。リモートバックエンド関与なし |
| `skillrunner.job.v1` | skillrunner / acp | 単一ステップの SkillRunner Skill 実行 |
| `skillrunner.sequence.v1` | acp | 複数ステップの連鎖 Skill 実行 |
| `acp.prompt.v1` | acp | ACP バックエンドに直接プロンプトを送信 |
| `acp.skill.run.v1` | acp | ACP バックエンドに Skill 実行を直接送信 |
| `generic-http.request.v1` | generic-http | 単一ステップの HTTP API 呼び出し |
| `generic-http.steps.v1` | generic-http | 複数ステップの HTTP API 呼び出し |

## pass-through.run.v1 — 純粋なローカル実行

リモートバックエンドは不要。プラグイン内で直接実行される。ファイル操作やデータエクスポートなど、純粋なローカルシナリオに適する。

```json
{
  "provider": "pass-through",
  "request": {
    "kind": "pass-through.run.v1"
  }
}
```

`buildRequest` フックでリクエストを構築する際、通常は `selectionContext` と `parameter` を渡す。

```js
export function buildRequest({ selectionContext, executionOptions }) {
  return {
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: executionOptions?.workflowParams || {},
  };
}
```

## skillrunner.job.v1 — 単一ステップ Skill 実行

単一の Skill 実行リクエストを Skill-Runner バックエンドに送信する。送信後に結果をポーリングする。

```json
{
  "provider": "skillrunner",
  "request": {
    "kind": "skillrunner.job.v1",
    "create": {
      "skill_id": "literature-analysis",
      "skill_source": "local-package"
    },
    "input": {
      "upload": {
        "files": [
          { "key": "source", "from": "selected.markdown" }
        ]
      }
    },
    "poll": {
      "interval_ms": 2000,
      "timeout_ms": 600000
    }
  }
}
```

| フィールド | 説明 |
|-----------|------|
| `create.skill_id` | 実行する Skill の識別子 |
| `create.skill_source` | Skill のソース。`"local-package"`（パッケージに同梱）、`"installed"`（インストール済み） |
| `input.upload.files` | アップロードするファイルのリスト。`from` は `"selected.markdown"`、`"selected.pdf"`、`"selected.source"` のいずれか |
| `poll.interval_ms` | ポーリング間隔（ミリ秒） |
| `poll.timeout_ms` | 合計タイムアウト（ミリ秒） |

Workflow が ACP バックエンドを選択した場合、`skillrunner.job.v1` は自動的に `acp.skill.run.v1` に適応するため、`skillrunner.job.v1` として宣言された Workflow も ACP バックエンドと互換性がある。

## skillrunner.sequence.v1 — 複数ステップ Skill 連鎖

複数の Skill を連鎖的に実行する必要がある場合（あるステップの出力が次のステップの入力になる場合）、シーケンス実行を使用する。代表的なシナリオは多段階パイプラインである（例：トピック合成の3ステップフロー：prepare → core enrichment → finalize）。各ステップは異なる Skill が処理し、handoff メカニズムを通じて中間結果を渡す。

複数の Skill をシーケンスで連鎖させ、あるステップの出力を次のステップの入力として使用できる（handoff）。

```json
{
  "provider": "acp",
  "request": {
    "kind": "skillrunner.sequence.v1",
    "sequence": {
      "steps": [
        {
          "id": "prepare",
          "skill_id": "create-topic-synthesis-prepare",
          "workspace": "new",
          "parameter": { "language": "en-US" }
        },
        {
          "id": "core",
          "skill_id": "topic-synthesis-core-enrichment",
          "workspace": "reuse-workflow",
          "handoff": {
            "from_step": "prepare",
            "pass_through": true
          }
        },
        {
          "id": "finalize",
          "skill_id": "topic-synthesis-finalize",
          "workspace": "reuse-workflow"
        }
      ]
    }
  }
}
```

### ステップの設定

| フィールド | 説明 |
|-----------|------|
| `id` | ステップの一意の識別子。handoff から参照される |
| `skill_id` | 実行する Skill の識別子 |
| `mode` | **必須。** 実行モード。`"auto"`（非インタラクティブ）または `"interactive"`（ユーザー入力が必要） |
| `workspace` | ワークスペースポリシー。`"new"`（新しいワークスペースを作成）、`"reuse-workflow"`（親ワークスペースを再利用） |
| `parameter` | Skill に渡されるパラメータ |
| `input` | Skill に渡される入力データ |
| `short_circuit` | 早期終了ルール。以下を参照 |
| `fetch_type` | ステップごとに fetch タイプを指定する。`"bundle"`（zip アーティファクトバンドルをダウンロード）。未指定の場合は Workflow レベルの `result.fetch.type` を使用 |
| `apply_result` | ステップレベルの結果適用。`workflow_id` はどのサブ Workflow の `applyResult` を呼び出すかを指定する。`on_failure` は失敗時の動作を制御する（`"continue"` または `"fail_sequence"`） |
| `include_if` | 条件付きステップ実行。`{ kind: "parameter", parameter: "...", equals: ... }` で Workflow パラメータをチェックするか、`{ kind: "runtime", condition: "..." }` でランタイム条件を指定する |

### 早期終了（short_circuit）

ステップの戻り値が条件を満たした場合、後続のステップをスキップし、現在のステップの出力を最終結果として使用する。

```json
{
  "id": "prepare",
  "skill_id": "create-topic-synthesis-prepare",
  "workspace": "new",
  "short_circuit": {
    "when": {
      "path": "status",
      "equals": "canceled"
    },
    "result": "step_output"
  }
}
```

| フィールド | 説明 |
|-----------|------|
| `when.path` | ステップ出力 JSON のどのフィールドをチェックするか |
| `when.equals` | フィールドの値がこの値と等しい場合に終了をトリガーする |
| `result` | 終了後の結果。`"step_output"`（現在のステップの完全な出力） |

### Handoff の設定

handoff は `bindings` 配列を通じて、あるステップから後続のステップにデータを渡す。各 binding は1つの値またはファイルの転送を記述する。

**全パススルー（前のステップの全出力フィールド）：**

```json
{
  "handoff": {
    "bindings": [
      {
        "kind": "value",
        "target": "/input/handoff"
      }
    ]
  }
}
```

**選択的フィールドマッピング：**

```json
{
  "handoff": {
    "bindings": [
      {
        "kind": "value",
        "step": "step1",
        "source": "output_field_name",
        "target": "/input/field_name",
        "required": false
      },
      {
        "kind": "value",
        "step": "step1",
        "source": "status",
        "target": "/input/step1_status",
        "required": false
      }
    ]
  }
}
```

| Binding フィールド | 説明 |
|-------------------|------|
| `kind` | データ値には `"value"`、ファイル参照には `"file"` |
| `step` | ソースステップ ID（どのステップの出力から読み取るか）。省略した場合は直前のステップから読み取る |
| `source` | ソースステップの出力 JSON 内のフィールド名 |
| `target` | 現在のステップの入力に値を書き込む JSON パス（例：`"/input/field_name"`） |
| `required` | `true` の場合、ソース値が欠落しているときにステップが失敗する。デフォルトは `false` |
| `value` | `kind: "value"` 用。渡すリテラル値（`step`/`source` が省略された場合に使用） |

## generic-http.request.v1 — HTTP API 呼び出し

Generic HTTP バックエンドに単一の HTTP リクエストを送信する。

```json
{
  "provider": "generic-http",
  "request": {
    "kind": "generic-http.request.v1"
  }
}
```

外部 REST API（例：MinerU PDF 解析サービス）の呼び出しに一般的に使用される。

## generic-http.steps.v1 — 複数ステップ HTTP 呼び出し

複数の HTTP リクエストステップをシーケンスで実行する。

```json
{
  "provider": "generic-http",
  "request": {
    "kind": "generic-http.steps.v1"
  }
}
```

## Provider の選び方

| Workflow が必要な動作 | 選択する Provider | リクエスト種別 |
|---------------------|------------------|---------------|
| 純粋なローカル操作。リモート呼び出しなし | `pass-through` | `pass-through.run.v1` |
| 単一の Skill を SkillRunner に送信 | `skillrunner` | `skillrunner.job.v1` |
| 複数の Skill を連鎖的に実行 | `acp` | `skillrunner.sequence.v1` |
| HTTP API を呼び出す | `generic-http` | `generic-http.request.v1` |

注：`provider` は Workflow が対応するバックエンドを決定する唯一のフィールドである。`request.kind` は正しい実行エンジンへのルーティングにのみ使用され、バックエンド互換性の推論には関与しない。

## 次のステップ

- [デバッグとテスト](debugging) — Workflow のリクエストとレスポンスを検証する
- [パッケージングとデプロイ](packaging) — Workflow をユーザーに公開する
