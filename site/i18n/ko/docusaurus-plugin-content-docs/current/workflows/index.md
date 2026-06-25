# Workflow 개요

## Workflow란?

Workflow는 Zotero Agents의 핵심 기능으로, 여러 스킬 단계를 자동화된 처리 파이프라인으로 결합할 수 있습니다. Workflow는 하나의 완전한 작업을 정의합니다. 입력 수신, 데이터 처리, 출력 생성까지 전 과정을 포함합니다.

## Workflow 구조

```
workflow.json (manifest 파일)
├── manifest: 메타데이터, 버전, 이름 선언
├── parameters: 설정 가능한 파라미터 정의
├── inputs: 입력 유형 정의 (첨부파일, 항목, 노트 등)
├── hooks: JavaScript 훅 스크립트 (입력 필터링, 요청 빌드, 결과 적용)
└── provider: 필요한 백엔드 유형 지정
```

### 입력 단위 유형

| 유형 | 설명 |
|------|------|
| `attachment` | 항목의 첨부파일 |
| `parent` | 선택된 항목의 상위 항목 |
| `note` | 노트 항목 |
| `workflow` | 일괄 처리 범위 |

### 훅 시스템

Workflow는 실행의 여러 단계에서 사용자 정의 JavaScript 스크립트를 실행할 수 있습니다.

- **filterInputs**: 입력을 필터링하고 선택합니다
- **buildRequest**: 백엔드로 전송할 요청 콘텐츠를 빌드합니다
- **normalizeSettings**: 사용자 설정을 정규화합니다
- **applyResult**: 백엔드에서 반환된 결과를 Zotero에 적용합니다

## 세 가지 실행 백엔드

Workflow는 세 가지 백엔드 유형을 통해 실행할 수 있습니다.

| 백엔드 | 요청 유형 | 사용 사례 |
|---------|-------------|---------|
| **Skill-Runner** | `skill.run.v1` | 일반 스킬 실행, 인터랙티브 모드 지원 |
| **ACP** | `acp.skill.run.v1` | ACP 백엔드를 통한 스킬 실행 |
| **Generic HTTP** | `generic-http.request.v1` | HTTP API 호출 |

## 공식 Workflow 패키지

공식 Workflow는 플러그인 자체와 분리된 **독립 패키지**로 게시 및 설치됩니다. 설치 방법:

- 마우스 오른쪽 메뉴 → **Zotero Agents** → **📦 공식 Workflow 패키지 설치**
- 환경설정에서 **공식 Workflow 패키지 설치** 클릭

공식 패키지는 세 가지 업데이트 채널을 지원합니다: stable / beta / dev. 플러그인은 시작 시 자동으로 업데이트를 확인합니다.

## 공식 Workflow

플러그인은 기능별로 그룹화된 일련의 공식 Workflow를 포함합니다:

### 📚 문헌 분석 툴킷

| Workflow | 목적 | 입력 | 백엔드 | 문서 |
|---------|------|------|------|------|
| **Literature Analysis** ⭐ | PDF/MD에서 다이제스트, 참고문헌, 인용 분석을 생성합니다. 태그 규제로 연속 실행 가능 | 첨부파일 | Skill-Runner | [상세](literature-analysis) |
| **Interactive Literature Explainer** | 문헌 심층 이해를 위한 AI와의 다중 턴 대화, 환각 방지를 위한 검증된 답변 제공 | 첨부파일 | Skill-Runner | [상세](literature-explainer) |
| **Deep Reading** | 번역 지원 포함 구조화된 심층 독서 HTML 보기를 생성합니다 | 첨부파일 | ACP | [상세](literature-deep-reading) |
| **Literature Search & Ingest** | AI가 학술 문헌을 검색하여 Zotero로 직접 수집합니다 | workflow | ACP | [상세](literature-search-ingest) |
| **Tag Bootstrapper** | 연구 도메인에 대한 제어된 태그 어휘를 대화형으로 생성합니다 | workflow | Skill-Runner | [상세](tag-bootstrapper) |
| **Tag Regulator** | 제어된 어휘를 기반으로 태그를 정규화하고 새 태그를 추론합니다 | 상위 항목 | Skill-Runner | [상세](tag-regulator) |
| **Export/Import Notes** | 편집 및 재가져오기를 지원하며 분석 노트를 내보내기 또는 가져오기합니다 | 상위 항목 | 백엔드 불필요 | [상세](export-import-notes) |

### 🛠️ 유틸리티

| Workflow | 목적 | 입력 | 백엔드 | 문서 |
|---------|------|------|------|------|
| **MinerU PDF 파싱** | MinerU 서비스를 호출하여 PDF를 Markdown으로 파싱합니다 | 첨부파일 | Generic HTTP | [상세](mineru) |
| **Topic Synthesis** | 토픽 통합 분석 및 보고서를 생성하는 3단계 파이프라인 | workflow | ACP | [상세](topic-synthesis) |
| **Manuscript Literature Framing** | 서론 / 관련 작업 LaTeX 초안을 생성합니다 | workflow | ACP | [상세](manuscript-literature-framing) |

### 🔧 디버그 도구

| Workflow | 목적 | 백엔드 | 문서 |
|---------|------|------|------|
| **Debug Probe** | Workflow 시스템 개발 테스트 및 진단 | Skill-Runner | [상세](debug-probe) |

## 다음 단계

- [Workflow 호출 및 설정](invocation)
- [백엔드 설정](../backends/) — 백엔드 설정에 대한 자세한 안내
