# 파라미터 시스템

Workflow에서는 실행 전 사용자가 입력할 수 있는 설정 대화상자를 표시하는 구성 가능한 파라미터를 정의할 수 있습니다. 파라미터 시스템은 여러 타입과 동적 데이터 소스를 지원합니다.

## 파라미터 정의

파라미터는 `workflow.json`의 `parameters` 필드에 정의됩니다:

```json
{
  "parameters": {
    "language": {
      "type": "string",
      "title": "출력 언어",
      "description": "출력 콘텐츠의 언어를 선택하세요",
      "default": "en-US",
      "enum": ["en-US", "zh-CN", "ja-JP"],
      "allowCustom": true
    },
    "maxResults": {
      "type": "number",
      "title": "최대 결과 수",
      "description": "반환되는 결과 수의 상한",
      "default": 10,
      "min": 1,
      "max": 100
    },
    "enableFilter": {
      "type": "boolean",
      "title": "필터링 활성화",
      "description": "결과 필터링 활성화 여부",
      "default": true,
      "visible_if": { "parameter": "language", "equals": false }
    }
  }
}
```

## 파라미터 타입

| 타입 | 설명 | 적용 가능한 컨트롤 |
|------|------|------------------|
| `string` | 텍스트 문자열 | 텍스트 박스 / 드롭다운 / 동적 선택기 |
| `number` | 숫자 | 숫자 입력 (min/max 제약 지원) |
| `boolean` | 불리언 | 토글 / 체크박스 |

## Enum 값과 사용자 정의 값

```json
{
  "language": {
    "type": "string",
    "enum": ["en-US", "zh-CN", "ja-JP"],
    "allowCustom": true,
    "default": "en-US"
  }
}
```

- `enum`: 제안된 프리셋 값 목록. 드롭다운 메뉴에서 선택 가능한 옵션으로 표시
- `allowCustom` (string 타입만): `true`로 설정하면, `enum` 값은 권장사항일 뿐이며 사용자는 자유롭게 다른 값을 입력할 수 있습니다. `false`로 설정하거나 생략하면, 사용자는 `enum`에서만 선택할 수 있습니다

## 조건부 표시

```json
{
  "advancedMode": {
    "type": "boolean",
    "title": "고급 모드",
    "default": false
  },
  "customEndpoint": {
    "type": "string",
    "title": "사용자 정의 엔드포인트",
    "visible_if": { "parameter": "advancedMode", "equals": true }
  }
}
```

`visible_if`는 설정 대화상자에서 파라미터의 표시/숨김을 제어합니다:

- `equals: true` — 대상 파라미터 값이 truthy일 때만 표시
- `equals: false` — 대상 파라미터 값이 falsy일 때만 표시

**예시: 연결된 표시/숨김**

```json
{
  "auto_tag_regulator": {
    "type": "boolean",
    "title": "자동 태그 조절기",
    "default": true
  },
  "auto_tag_infer_tag": {
    "type": "boolean",
    "title": "태그 추론",
    "default": true,
    "visible_if": { "parameter": "auto_tag_regulator", "equals": true }
  }
}
```

`auto_tag_regulator`의 체크가 해제되면, `auto_tag_infer_tag` 파라미터가 자동으로 숨겨집니다.

## 동적 옵션 소스

파라미터 값 옵션은 Zotero의 실시간 데이터에서 올 수 있습니다:

```json
{
  "targetCollection": {
    "type": "string",
    "title": "대상 컬렉션",
    "default": "",
    "optionsSource": {
      "kind": "zotero.collections",
      "library": "current",
      "includeEmpty": true,
      "valueFormat": "collectionRef",
      "labelFormat": "path"
    }
  },
  "relatedTopic": {
    "type": "string",
    "title": "관련 주제",
    "optionsSource": {
      "kind": "synthesis.topics",
      "filter": "updatable"
    }
  }
}
```

### 지원되는 옵션 소스

| `kind` | 설명 | 사용 가능한 파라미터 |
|--------|------|---------------------|
| `zotero.collections` | 현재 Zotero 라이브러리의 컬렉션 목록 | `library` (current/user/number), `includeEmpty`, `valueFormat` (collectionRef), `labelFormat` (path/title) |
| `synthesis.topics` | Synthesis Workbench의 주제 목록 | `filter` (all/updatable), `valueFormat` (topicId), `labelFormat` (title) |

### 일반적인 optionsSource 파라미터

| 파라미터 | 설명 |
|----------|------|
| `library` | 라이브러리 범위. `"current"` (현재 라이브러리), `"user"` (사용자 라이브러리), 숫자 (특정 라이브러리 ID) |
| `includeEmpty` | 빈 옵션 포함 여부 ("선택 없음"용) |
| `valueFormat` | 옵션 값의 형식: `"collectionRef"` / `"topicId"` |
| `labelFormat` | 옵션 라벨의 표시 형식: `"path"` / `"title"` |
| `allowStale` | 캐시된 데이터 사용 허용 (설정이 열릴 때마다 매번 재요청하지 않도록) |
| `filter` | 필터 조건 (kind에 따라 다름) |

## 숫자 파라미터의 제약

```json
{
  "confidence": {
    "type": "number",
    "title": "신뢰도 임계값",
    "default": 0.8,
    "min": 0,
    "max": 1
  }
}
```

`min`과 `max`는 입력 값의 범위를 제약합니다.

## 훅에서 파라미터 읽기

`buildRequest`, `filterInputs`, `applyResult`에서 `executionOptions.workflowParams`를 통해 사용자가 설정한 파라미터 값을 읽을 수 있습니다:

```js
export function buildRequest({ executionOptions, runtime }) {
  const params = executionOptions?.workflowParams || {};
  const language = params.language || "en-US";
  const maxResults = params.maxResults || 10;

  return {
    kind: "skillrunner.job.v1",
    create: { skill_id: "my-skill" },
    parameter: { language, max_results: maxResults },
  };
}
```

## 파라미터 지역화

파라미터의 `title`과 `description`은 지역화를 지원합니다:

```json
{
  "i18n": {
    "messages": {
      "zh-CN": {
        "parameters.language.title": "언어",
        "parameters.language.description": "출력 콘텐츠의 언어를 선택하세요"
      }
    }
  }
}
```

전체 지역화 메커니즘에 대해서는 [지역화](localization) 페이지를 참조하세요.

## 다음 단계

- [선택 컨텍스트](selection-context) — 사용자의 항목 선택이 Workflow에 전달되는 방식 이해
- [요청 종류](request-kinds) — 다양한 요청 종류에 대한 파라미터 전달 방법
