# 커스텀 Workflow 아키텍처 개요

Zotero Agents의 Workflow 시스템은 **플러그 가능한 아키텍처**를 사용합니다 — 각 Workflow는 독립적이고 자체 완결된 디렉토리이며, `workflow.json` 매니페스트 파일과 해당 Hook 스크립트만 있으면 됩니다. 플러그인의 Workflow Manager가 자동으로 발견하고 로드합니다.

## 디렉토리 구조

Workflow는 두 위치에 저장할 수 있습니다:

| 위치 | 유형 | 설명 |
|----------|------|-------------|
| 공식 Workflow 패키지 | 공식 | Content Feed를 통해 독립적으로 설치됩니다. `<Zotero Data>/zotero-agents/content/official/workflows/`에 위치합니다 |
| 사용자 Workflow 디렉토리 | 커스텀 | 환경설정에서 구성하며, Workflow Manager가 자동으로 스캔합니다 |

플러그인의 **Workflow Manager**는 공식 패키지 디렉토리와 사용자 Workflow 디렉토리를 재귀적으로 스캔하여 `workflow.json` 파일을 발견하고 사용 가능한 Workflow로 등록합니다.

## 최소 Workflow 예시

커스텀 Workflow를 만들려면 단 **2개의 파일**만 있으면 됩니다:

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

`my-workflow/`을 사용자 Workflow 디렉토리에 넣은 후 대시보드를 다시 열면 Workflow를 확인할 수 있습니다.

## Workflow 아키텍처 레이어

Workflow의 생명주기는 다음 레이어를 포함합니다:

```
사용자 작업 (우클릭 / 대시보드)
    │
    ▼
Workflow Manager — 발견, 로드, 유효성 검증
    │
    ├── 입력 — 사용자가 어떤 항목을 선택했는가?
    ├── 파라미터 — 사용자가 어떤 파라미터를 설정했는가?
    ├── Hook — 전처리, 요청 구성, 결과 처리
    └── 실행 — Provider에 의해 백엔드로 디스패치됨
         │
         ▼
      Provider (SkillRunner / ACP / Generic HTTP / Pass-through)
         │
         ▼
      백엔드 — 원격 또는 로컬 실행 엔진
```

## Workflow 패턴 분류

실행 방식과 백엔드 유형에 따라 Workflow를 다음과 같이 분류할 수 있습니다:

| 패턴 | 일반적인 사용 사례 | 백엔드 유형 |
|---------|-----------------|--------------|
| **pass-through** | 순수 로컬 작업(내보내기, 파일 처리), 원격 백엔드 불필요 | 없음 |
| **skillrunner.job.v1** | SkillRunner에 제출하는 단일 단계 스킬 실행 | skillrunner / acp |
| **skillrunner.sequence.v1** | 단계 간 릴레이가 있는 다단계 체인 스킬 실행 | acp |
| **generic-http.request.v1** | 단일 HTTP API 호출 | generic-http |
| **generic-http.steps.v1** | 다단계 HTTP API 호출 | generic-http |

## workflow.json의 핵심 개념

```json
{
  "id": "고유 식별자",
  "label": "표시 이름",
  "provider": "백엔드 유형",
  "inputs": { "unit": "입력 단위 유형" },
  "parameters": { /* 구성 가능한 파라미터 */ },
  "execution": { /* 실행 제어 */ },
  "request": { "kind": "요청 종류" },
  "hooks": { "applyResult": "결과 처리를 위한 스크립트 경로" }
}
```

다음 페이지에서 각 필드의 의미와 사용 방법을 자세히 설명합니다.

## 다음 단계

- [Workflow 매니페스트 작성](manifest) — workflow.json의 각 필드 상세 설명
- [Hook 시스템](hooks) — 각 단계의 Hook 작성 방법
- [파라미터 시스템](parameters) — 구성 가능한 파라미터 정의
