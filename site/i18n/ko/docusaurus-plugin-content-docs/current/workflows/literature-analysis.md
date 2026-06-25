# Literature Analysis

## 목적

PDF 또는 Markdown 첨부파일에서 문헌 다이제스트, 참고문헌 목록, 인용 분석 보고서를 생성합니다.

**Literature Analysis는 에이전트 기반 문헌 관리의 기반입니다** — 수집된 모든 논문은 이 Workflow를 통해 실행되어야 합니다. 각 논문에 대한 구조화된 지식 기반을 확립하며, 인용 그래프 및 토픽 통합과 같은 모든 고급 기능은 이 Workflow의 출력에 의존합니다.

이 Workflow는 Skill-Runner 백엔드에서 `literature-analysis` 스킬을 호출하여 학술 논문의 구조화된 분석을 수행합니다.

:::tip 모범 사례
- **Markdown을 먼저 추출하세요**: Literature Analysis를 실행하기 전에 [MinerU](mineru)를 사용하여 PDF를 Markdown으로 변환하는 것이 좋습니다. 원본 Markdown은 논문 구조에 대한 AI 이해를 크게 향상시킵니다.
- **태그 어휘를 먼저 초기화하세요**: 첫 Literature Analysis 전에 [Tag Bootstrapper](tag-bootstrapper)를 실행하여 제어된 태그 어휘를 초기화하는 것이 좋습니다. 이를 통해 분석 파이프라인의 자동 태그 규제가 최대 효과를 발휘할 수 있습니다.
:::

## 사용 사례

- 새 논문을 읽을 때 핵심 콘텐츠의 요약을 빠르게 확인
- 논문의 전체 참고문헌 목록 수집
- 논문의 인용 맥락 및 인용 의도 분석

## 입력 제약

| 제약 유형 | 설명 |
|---------|------|
| 입력 단위 | 첨부파일 |
| 허용 유형 | `text/markdown`, `text/x-markdown`, `text/plain`, `application/pdf` |
| 상위 항목당 제한 | 최대 1개의 첨부파일 |

### 실행 방법

- PDF 또는 Markdown 첨부파일을 직접 선택
- 상위 항목을 선택하면 플러그인이 자동으로 첫 번째 적합 첨부파일을 확장합니다

## 실행 흐름

```
1. 요청 빌드
   └── Skill-Runner에 소스 파일 업로드
       └── skill_id: "literature-analysis" 호출

2. Skill-Runner 처리
   └── 문서 콘텐츠 파싱
       └── 세 가지 출력 생성:
           ├── digest.md          (문헌 다이제스트)
           ├── references.json    (참고문헌 목록)
           └── citation_analysis.json (인용 분석)

3. 결과 반환
   └── 번들 (zip) 다운로드
       └── result.json 및 artifacts/ 포함
```

### 실행 모드

완전 자동, 사용자 개입 불필요. 제출 후 완료될 때까지 기다리면 됩니다.

### 실행 설정

- `execution.mode`: `auto` — 자동 실행, 사용자 개입 불필요
- `skillrunner_mode`: `auto` — 비인터랙티브 모드

## 예상 소요 시간

| 시나리오 | 예상 시간 |
|------|---------|
| 표준 참고문헌 형식 | 6-10분 |
| 비표준 참고문헌 형식 | 12-18분 |

소요 시간은 주로 참고문헌 형식이 표준적인지에 따라 달라집니다 — 형식이 표준화될수록 (예: ScienceDirect, IEEE 및 기타 주류 저널의 인용) AI 파싱이 더 빠릅니다. 논문 길이는 비교적 적은 영향을 미칩니다.

## 출력

실행이 완료되면 상위 항목 아래에 **3개의 Zotero 노트**가 생성됩니다:

### 1. 다이제스트 노트

- 유형: `data-zs-note-kind="digest"`
- 콘텐츠: 연구 배경, 방법, 결과 및 결론을 다루는 HTML로 렌더링된 문헌 다이제스트
- 업데이트 전략: 각 실행 시 동일한 이름의 노트를 업데이트합니다 (이미 존재하면 덮어씁니다)

![Literature Analysis 다이제스트 노트](/img/docs/workflows/literature-analysis_digest.png)

:::info 노트 콘텐츠에 대하여
노트에 표시되는 콘텐츠는 백엔드 데이터에서 **렌더링**된 것입니다. Zotero에서 노트 콘텐츠를 직접 수정해도 실제 백엔드 데이터는 **변경되지 않습니다**. 분석 결과를 편집하려면 [Export/Import Notes](export-import-notes) 기능을 사용하여 내보내기, 수정 후 다시 가져오기하세요.
:::

### 2. 참고문헌 노트

- 유형: `data-zs-note-kind="references"`
- 콘텐츠: 참고문헌 HTML 표 (#, 연도, 제목, 저자, 출처, 위치)
- 업데이트 전략: 각 실행 시 동일한 이름의 노트를 업데이트합니다

![Literature Analysis 참고문헌 노트](/img/docs/workflows/literature-analysis_references.png)

### 3. 인용 분석 노트

- 유형: `data-zs-note-kind="citation-analysis"`
- 콘텐츠: 인용 맥락 및 인용 의도 분류를 포함한 인용 분석 보고서
- 업데이트 전략: 각 실행 시 동일한 이름의 노트를 업데이트합니다

![Literature Analysis 인용 분석 노트](/img/docs/workflows/literature-analysis_citation-analysis.png)

## 파라미터

| 파라미터 | 유형 | 설명 | 기본값 |
|------|------|------|--------|
| `language` | string | 출력 언어 | `zh-CN` |
| `auto_tag_regulator` | boolean | 문헌 분석 후 [Tag Regulator](tag-regulator)를 자동으로 연속 실행할지 여부. **활성화 권장** | `true` |
| `auto_tag_infer_tag` | boolean | 태그 규제를 연속 실행할 때 AI가 새 태그를 추론할지 여부 (`auto_tag_regulator`가 활성화된 경우에만 표시) | `true` |

`language` 사용 가능한 값: `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. 사용자 지정 입력도 지원됩니다.

## 모델 권장 사항

🔴 **강력한 텍스트 이해 능력**을 갖춘 모델이 권장됩니다. 백엔드에서 서브에이전트 위임을 지원하는 경우 (예: Claude Code, Codex) 다이제스트, 참고문헌 및 인용 분석을 병렬로 처리하여 전체 시간을 크게 단축할 수 있습니다.

## 의존성

- **백엔드**: Skill-Runner 서비스
- **백엔드 설정**: 백엔드 관리자에서 Skill-Runner 유형의 백엔드를 설정해야 합니다
- **스킬**: `literature-analysis` 스킬이 Skill-Runner에 배포되어야 합니다

## 관련 Workflow

- [Tag Bootstrapper](tag-bootstrapper) — 첫 분석 전에 제어된 태그 어휘를 초기화합니다
- [MinerU](mineru) — 먼저 PDF를 Markdown으로 변환하여 최상의 분석 품질을 얻습니다
- [Interactive Literature Explainer](literature-explainer) — AI와의 대화를 통한 문헌 심층 이해
- [Export/Import Notes](export-import-notes) — 분석 결과물을 내보내어 편집하거나 Zotero 인스턴스 간에 마이그레이션합니다
- [Tag Regulator](tag-regulator) — 태그 규제를 독립적으로 실행합니다 (Literature Analysis에서 자동으로 연속 실행 가능)
