# Tag Auditor

## 목적

Zotero 라이브러리의 모든 최상위 일반 항목을 제어된 태그 어휘에 대해 스캔하고 항목별 태그 준수를 보고합니다. 결과는 검토 및 후속 규제를 위해 Synthesis Workbench 태그 감사 패널에 기록됩니다.

## 입력

파라미터나 Zotero 항목 선택이 필요하지 않습니다. 워크플로는 전체 라이브러리에서 작동합니다.

## 동작

1. `exportTagVocabularyForRegulator`를 통해 Synthesis에서 제어된 태그 어휘를 로드합니다.
2. 라이브러리의 모든 최상위 일반 항목을 페이지 단위로 읽습니다(하위 항목, 노트, 첨부파일 및 삭제된 항목 제외).
3. 각 항목에 대해 현재 태그를 수집하고 준수를 평가합니다. 제어된 어휘에 없는 태그는 비준수입니다.
4. 감사 항목을 라이브러리 ID별로 그룹화하고 `replaceTagAuditRecords`를 통해 Synthesis에 기록합니다.

워크플로는 완전히 자동이며 Zotero 항목이나 태그를 수정하지 않습니다. 태그 패널용 감사 레코드를 생성하는 읽기 전용 스캔입니다.

## 출력 및 적용

Synthesis Workbench 태그 감사 패널은 항목별 감사 레코드를 표시하며, 각 레코드에는 다음이 포함됩니다:

| 필드 | 설명 |
|-------|-------------|
| `itemKey` | Zotero 항목 키 |
| `compliant` | 항목의 모든 태그가 제어된 어휘에 있는지 여부 |
| `nonCompliantTags` | 제어된 어휘에서 찾을 수 없는 태그 목록 |

실행 결과는 감사된 항목 수와 라이브러리별 태그 규제가 필요한 항목 수를 요약합니다. 워크플로를 다시 실행하면 이전 감사 레코드가 대체됩니다(같은 어휘 상태 내에서 멱등).

전제 조건으로 제어된 태그 어휘가 Synthesis Workbench의 태그 페이지에 이미 정의되어 있어야 합니다.

## 종속성

- 백엔드 연결 불필요
- **제어된 어휘**: 제어된 태그 어휘를 먼저 정의해야 합니다. [태그 관리](#doc/synthesis%2Ftags) 참조

## 관련 Workflow

- [Tag Regulator](#doc/workflows%2Ftag-regulator) — 제어된 어휘를 기반으로 태그 정규화 및 새 태그 추론
- [Tag Bootstrapper](#doc/workflows%2Ftag-bootstrapper) — 대화형으로 제어된 태그 어휘 생성
