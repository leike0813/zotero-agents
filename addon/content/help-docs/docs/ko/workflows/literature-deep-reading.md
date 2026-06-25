# Deep Reading

## 목적

논문에 대한 심층 독서를 수행하여 구조화된 다중 관점의 독서 이해 분석 보기를 생성합니다. 장 구조, 핵심 개념 및 참고문헌을 자동 추출하고, 단락별 번역을 지원하며, 독립 실행형 HTML 독서 문서를 출력합니다.

## 사용 사례

- 중요한 논문을 체계적으로 심층 독서할 때
- 장 주석, 핵심 개념 및 추가 읽기를 포함한 종합적인 분석을 얻을 때
- 이중 언어 병렬 독서 (원문 + 대상 언어 번역)가 필요할 때

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

Deep Reading Workflow는 사용자 개입이 필요 없는 **완전 자동** 다단계 처리 파이프라인입니다:

## 예상 소요 시간

| 파일 크기 | 예상 시간 |
|---------|---------|
| 짧은 논문 (≤10쪽) | 8-12분 |
| 표준 (10-30쪽) | 12-18분 |
| 긴 논문 (30쪽 이상) | 18-25분 |

이 Workflow는 다단계 처리 (가이던스 → 보강 → 번역 → 정리 → 렌더링)를 수반하므로, 단일 논문 분석 Workflow 중 가장 오래 실행됩니다.

## 모델 권장 사항

🟡 **강력한 텍스트 이해 능력**을 갖춘 모델이 권장됩니다. 이 Workflow는 논문에 대한 다층 심층 분석 (구조, 개념, 논증 로직)이 필요하므로 모델의 의미 이해에 높은 요구가 있습니다. 서브에이전트 위임 기능이 있는 경우 단계를 병렬로 실행하여 전체 시간을 크게 단축할 수 있습니다.

## 출력

```
1. 준비 단계
   └── 소스 파일 업로드, source_bundle.zip 생성
       └── 원문, 이미지 및 기존 참고문헌 포함

2. 가이던스 및 컨텍스트 수집
   └── 원문 구조 및 메타데이터 분석
       └── Host Bridge를 통해 관련 컨텍스트 수집

3. 독서 보강
   └── 장 주석, 핵심 개념, 참고문헌 분석 생성
       └── 요약 및 추가 읽기 보기

4. 블록별 번역
   └── 안정 블록 단위로 번역 정규화
       └── 이중 언어 병렬 번역 보기 생성

5. 최종 렌더링
   └── 모든 분석 보기를 통합
       └── 독립 실행형 HTML 파일로 렌더링
```

## 출력 결과물

실행이 완료되면 상위 항목 아래에 생성된 HTML 파일을 가리키는 연결된 첨부파일이 생성됩니다:

- **형식**: 독립 실행형 HTML 파일 (브라우저에서 열 수 있음)
- **콘텐츠**: 원문 구조, 장 주석, 개념 분석, 참고문헌, 이중 언어 번역 등을 포함한 완전한 심층 독서 보기
- **수명 주기**: 각 실행마다 덮어쓰기 및 업데이트됩니다

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/literature-deep-reading_1.webp" alt="Deep Reading 시작 가이드" title="Deep Reading 시작 가이드" loading="lazy" /><figcaption>Deep Reading 시작 가이드</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/literature-deep-reading_2.webp" alt="Deep Reading 이중 언어 동적 독서" title="Deep Reading 이중 언어 동적 독서" loading="lazy" /><figcaption>Deep Reading 이중 언어 동적 독서</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/literature-deep-reading_3.webp" alt="Deep Reading 참고문헌 초록 읽기" title="Deep Reading 참고문헌 초록 읽기" loading="lazy" /><figcaption>Deep Reading 참고문헌 초록 읽기</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/literature-deep-reading_4.webp" alt="Deep Reading 참고문헌 2-홉 서브그래프" title="Deep Reading 참고문헌 2-홉 서브그래프" loading="lazy" /><figcaption>Deep Reading 참고문헌 2-홉 서브그래프</figcaption></figure>

## 파라미터

| 파라미터 | 유형 | 설명 | 기본값 |
|------|------|------|--------|
| `target_language` | string | 대상 언어 | `zh-CN` |

사용 가능한 값: `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. 사용자 지정 입력도 지원됩니다.

## 의존성

- **백엔드**: ACP 백엔드 (ACP 프로토콜 지원 필요)
- **백엔드 설정**: 백엔드 관리자에서 ACP 유형의 백엔드를 설정해야 합니다

## 관련 Workflow

- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — 문헌 다이제스트 및 인용 분석을 자동 생성합니다
- [Interactive Literature Explainer](#doc/workflows%2Fliterature-explainer) — AI와의 대화를 통한 문헌 심층 이해
