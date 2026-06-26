# 로컬라이제이션

Workflow 시스템은 다국어 로컬라이제이션을 지원하여, 동일한 Workflow가 서로 다른 언어의 Zotero 인터페이스에서 해당하는 이름과 설명으로 표시되도록 합니다.

## 로컬라이제이션 계층

Workflow 로컬라이제이션은 다음 우선순위 순서로 폴백됩니다:

```
인라인 메시지 (manifest.i18n.messages)  ← 최고 우선순위
        ↓
패키지 레벨 로케일 파일 (workflow-package의 locales/)
        ↓
로 매니페스트 필드 (label / description 등 영어 기본값)
        ↓
키 폴백 (예: "workflows.my-id.label")
```

## 인라인 로컬라이제이션 (단일 Workflow)

`workflow.json`에 직접 정의합니다:

```json
{
  "id": "my-workflow",
  "label": "My Workflow",
  "i18n": {
    "defaultLocale": "en-US",
    "messages": {
      "zh-CN": {
        "label": "我的 Workflow",
        "taskNameTemplate": "处理中: {query}",
        "parameters.language.title": "语言",
        "parameters.language.description": "选择输出内容的语言"
      },
      "ja-JP": {
        "label": "マイワークフロー",
        "taskNameTemplate": "処理中: {query}"
      }
    }
  }
}
```

로 매니페스트의 `label` 및 `taskNameTemplate`과 같은 필드는 기본값(보통 영어)으로 사용되며, `i18n.messages`의 번역이 해당 언어의 표시 텍스트를 재정의합니다.

### 키 명명 규칙

```
label                                    — Workflow 이름
taskNameTemplate                         — 작업 이름 템플릿
parameters.<paramKey>.title              — 파라미터 제목
parameters.<paramKey>.description         — 파라미터 설명
skills.<skillId>.name                    — 현재 workflow의 skill 표시 이름
```

`skills.<skillId>.name`은 UI의 표시 이름에만 영향을 미칩니다. Skill 패키지의 `runner.json.name`은 skill의 기본 이름으로 유지되며, workflow에 해당 번역이 선언되지 않으면 인터페이스가 `runner.json.name`을 폴백으로 표시합니다.

## 패키지 레벨 로컬라이제이션 (다중 Workflow 패키지)

`workflow-package.json`에서 로케일 파일을 선언합니다:

```json
{
  "id": "my-package",
  "i18n": {
    "defaultLocale": "en-US",
    "locales": {
      "zh-CN": "locales/zh-CN.json",
      "ja-JP": "locales/ja-JP.json"
    }
  }
}
```

`locales/zh-CN.json`의 내용:

```json
{
  "workflows.my-workflow.label": "我的工作流",
  "workflows.my-workflow.taskNameTemplate": "处理中: {query}",
  "workflows.my-workflow.skills.my-skill.name": "我的技能",
  "workflows.my-workflow.parameters.language.title": "语言",
  "workflows.another-workflow.label": "另一个工作流"
}
```

패키지 레벨 로케일 파일의 키는 정규화된 형식을 사용합니다: `workflows.<workflowId>.<field>`.

### 혼합 사용

패키지 레벨과 Workflow 인라인 메시지는 공존할 수 있으며, 인라인 메시지가 더 높은 우선순위를 가집니다. 모범 사례:

- 기본 언어(예: 영어)는 workflow.json 필드에 유지
- 번역은 패키지 레벨 로케일 파일에 배치하여 통합 관리
- 특정 Workflow에만 해당하는 번역은 Workflow의 인라인 메시지에 배치할 수도 있음

## 언어 매칭 로직

시스템은 다음 순서로 사용자의 언어 설정을 매칭하려고 시도합니다:

1. **정확히 일치**: 사용자의 로케일이 `"zh-CN"`이면, `"zh-CN"` 메시지를 조회
2. **언어 서브태그 매칭**: 사용자의 로케일이 `"zh-Hans-CN"`이면, 정확한 일치가 없을 경우 `"zh"` 매칭 시도
3. **defaultLocale 폴백**: `i18n.defaultLocale`에서 지정된 언어 사용
4. **로 필드 값 폴백**: `workflow.json`의 로 필드 값 사용 (예: `label`)
5. **키 폴백**: 키 이름 자체를 표시

## 파라미터 값 Enum의 로컬라이제이션

파라미터에 enum 값이 있는 경우, enum 값의 표시 텍스트는 현재 파라미터의 `title` 및 `description` 필드를 사용합니다. enum 값 자체의 로컬라이제이션이 필요한 복잡한 시나리오의 경우, Workflow의 `label` 또는 설명에서 설명하는 것을 권장합니다.

## Workflow에 새 언어 추가하기

1. 패키지의 `locales/` 디렉토리에 새 `<locale>.json` 파일을 생성
2. 기존 로케일 파일(예: `zh-CN.json`)을 참조하여 모든 키를 번역
3. `workflow-package.json`의 `i18n.locales`에 새 언어 항목 추가
4. 플러그인을 새로고침하여 적용

## 레퍼런스

- 공식 로케일 파일 예시: `content/official/workflows/literature-workbench-package/locales/zh-CN.json`
- 패키지 레벨 i18n 선언 예시: `content/official/workflows/literature-workbench-package/workflow-package.json`

## 다음 단계

- [요청 종류](#doc/workflows%2Fcustom%2Frequest-kinds) — 실행 백엔드 및 요청 유형 선택
- [패키징 및 배포](#doc/workflows%2Fcustom%2Fpackaging) — 로컬라이제이션이 포함된 Workflow 패키지 게시
