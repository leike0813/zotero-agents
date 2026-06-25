# 요청 종류

Workflow는 `request.kind`를 선언하여 어떤 Provider(실행기)가 요청을 처리하는지 결정합니다. 시스템에는 다양한 백엔드와 실행 모드에 해당하는 여러 내장 요청 종류가 있습니다.

## 요청 종류 개요

| `kind` | 적용 가능한 Provider | 설명 |
|--------|---------------------|------|
| `pass-through.run.v1` | pass-through | 순수 로컬 실행, 원격 백엔드 관여 없음 |
| `skillrunner.job.v1` | skillrunner / acp | 단일 단계 SkillRunner Skill 실행 |
| `skillrunner.sequence.v1` | acp | 다단계 연결 Skill 실행 |
| `acp.prompt.v1` | acp | ACP 백엔드로 프롬프트 직접 전송 |
| `acp.skill.run.v1` | acp | ACP 백엔드로 Skill 실행 직접 제출 |
| `generic-http.request.v1` | generic-http | 단일 단계 HTTP API 호출 |
| `generic-http.steps.v1` | generic-http | 다단계 HTTP API 호출 |

## pass-through.run.v1 — 순수 로컬 실행

원격 백엔드가 필요 없이 플러그인 내에서 직접 실행됩니다. 파일 작업 및 데이터 내보내기 같은 순수 로컬 시나리오에 적합합니다.

```json
{
  "provider": "pass-through",
  "request": {
    "kind": "pass-through.run.v1"
  }
}
```

`buildRequest` 훅에서 요청을 구성할 때, 일반적으로 `selectionContext`와 `parameter`를 전달합니다:

```js
export function buildRequest({ selectionContext, executionOptions }) {
  return {
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: executionOptions?.workflowParams || {},
  };
}
```

## skillrunner.job.v1 — 단일 단계 Skill 실행

Skill-Runner 백엔드로 단일 Skill 실행 요청을 제출합니다. 제출 후 결과를 폴링합니다.

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

| 필드 | 설명 |
|------|------|
| `create.skill_id` | 실행할 Skill의 식별자 |
| `create.skill_source` | Skill 소스. `"local-package"` (패키지에 포함), `"installed"` (이미 설치됨) |
| `input.upload.files` | 업로드할 파일 목록. `from`은 `"selected.markdown"`, `"selected.pdf"`, `"selected.source"` 가능 |
| `poll.interval_ms` | 폴링 간격 (밀리초) |
| `poll.timeout_ms` | 전체 타임아웃 (밀리초) |

Workflow에서 ACP 백엔드를 선택하면, `skillrunner.job.v1`이 자동으로 `acp.skill.run.v1`로 적응하므로, `skillrunner.job.v1`로 선언된 Workflow도 ACP 백엔드와 호환됩니다.

## skillrunner.sequence.v1 — 다단계 Skill 연결

여러 Skill을 순차적으로 연결해야 할 때(한 단계의 출력이 다음 단계의 입력이 되는), 시퀀스 실행을 사용합니다. 일반적인 시나리오로는 다단계 파이프라인(예: 주제 종합의 3단계 흐름: prepare → core enrichment → finalize)이 있으며, 각 단계는 서로 다른 Skill이 처리하고 핸드오프 메커니즘을 통해 중간 결과를 전달합니다.

여러 Skill을 순차적으로 연결하며, 한 단계의 출력이 다음 단계의 입력으로 사용될 수 있습니다(핸드오프).

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

### 단계 설정

| 필드 | 설명 |
|------|------|
| `id` | 단계의 고유 식별자, 핸드오프에서 참조 |
| `skill_id` | 실행할 Skill의 식별자 |
| `mode` | **필수.** 실행 모드: `"auto"` (비대화형) 또는 `"interactive"` (사용자 입력 필요) |
| `workspace` | 작업 공간 정책. `"new"` (새 작업 공간 생성), `"reuse-workflow"` (부모 작업 공간 재사용) |
| `parameter` | Skill에 전달되는 파라미터 |
| `input` | Skill에 전달되는 입력 데이터 |
| `short_circuit` | 조기 종료 규칙. 아래 참조 |
| `fetch_type` | 단계별 fetch 타입 지정. `"bundle"` (zip 아티팩트 번들 다운로드); 지정하지 않으면 Workflow 수준의 `result.fetch.type` 사용 |
| `apply_result` | 단계 수준의 결과 적용: `workflow_id`는 어떤 하위 Workflow의 `applyResult`를 호출할지 지정; `on_failure`는 실패 시 동작 제어 (`"continue"` 또는 `"fail_sequence"`) |
| `include_if` | 조건부 단계 실행. Workflow 파라미터를 확인하려면 `{ kind: "parameter", parameter: "...", equals: ... }`, 런타임 조건의 경우 `{ kind: "runtime", condition: "..." }` |

### 조기 종료 (short_circuit)

단계의 반환 값이 조건을 만족하면, 후속 단계를 건너뛰고 현재 단계의 출력을 최종 결과로 사용합니다.

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

| 필드 | 설명 |
|------|------|
| `when.path` | 단계 출력 JSON에서 확인할 필드 |
| `when.equals` | 필드 값이 이 값과 같을 때 종료 트리거 |
| `result` | 종료 후 결과: `"step_output"` (현재 단계의 전체 출력) |

### 핸드오프 설정

핸드오프는 `bindings` 배열을 통해 한 단계에서 후속 단계로 데이터를 전달합니다. 각 바인딩은 단일 값 또는 파일 전송을 설명합니다.

**전체 패스스루 (이전 단계의 모든 출력 필드):**

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

**선택적 필드 매핑:**

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

| 바인딩 필드 | 설명 |
|------------|------|
| `kind` | 데이터 값은 `"value"`, 파일 참조는 `"file"` |
| `step` | 소스 단계 ID (어떤 단계의 출력을 읽을지). 생략하면 직전 단계에서 읽음 |
| `source` | 소스 단계 출력 JSON의 필드 이름 |
| `target` | 현재 단계 입력에서 값이 기록되어야 할 JSON 경로 (예: `"/input/field_name"`) |
| `required` | `true`이면 소스 값이 없을 때 단계가 실패합니다. 기본값은 `false` |
| `value` | `kind: "value"`의 경우, 전달할 리터럴 값 (`step`/`source`가 생략될 때 사용) |

## generic-http.request.v1 — HTTP API 호출

Generic HTTP 백엔드로 단일 HTTP 요청을 전송합니다.

```json
{
  "provider": "generic-http",
  "request": {
    "kind": "generic-http.request.v1"
  }
}
```

일반적으로 외부 REST API(예: MinerU PDF 파싱 서비스)를 호출하는 데 사용됩니다.

## generic-http.steps.v1 — 다단계 HTTP 호출

여러 HTTP 요청 단계를 순차적으로 실행합니다.

```json
{
  "provider": "generic-http",
  "request": {
    "kind": "generic-http.steps.v1"
  }
}
```

## 올바른 Provider 선택 방법

| Workflow에서 필요한 작업... | 선택할 provider | 요청 종류 |
|---------------------------|----------------|----------|
| 순수 로컬 작업 수행, 원격 호출 없음 | `pass-through` | `pass-through.run.v1` |
| Skill-Runner에 단일 Skill 제출 | `skillrunner` | `skillrunner.job.v1` |
| 여러 Skill을 순차적으로 연결 | `acp` | `skillrunner.sequence.v1` |
| HTTP API 호출 | `generic-http` | `generic-http.request.v1` |

참고: `provider`는 Workflow가 어떤 백엔드와 호환되는지 결정하는 유일한 필드입니다. `request.kind`는 올바른 실행기로 라우팅하는 데만 사용되며, 백엔드 호환성 추론에는 관여하지 않습니다.

## 다음 단계

- [디버깅 및 테스트](debugging) — Workflow 요청 및 응답 검증
- [패키징 및 배포](packaging) — 사용자를 위한 Workflow 배포
