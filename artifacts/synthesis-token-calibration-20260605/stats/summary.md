# Synthesis Cross-Paper Context Token Calibration

Generated at: `2026-06-04T17:45:31.920928+00:00`
Host run root: `D:\Workspace\Artifact\Zotero-Skills\Zotero_data\zotero-agents\runtime\acp\skill-runs\acp-skill-synthesis-token-calibration-20260605`
Project output: `D:\Workspace\Code\JavaScript\Zotero-Skills\artifact\synthesis-token-calibration-20260605`
Token counter: `o200k_base`

## Artifact Coverage

- Library papers: 56
- Export manifest papers: 56
- Digest available for core sample: 52
- References or citation-analysis available for external sample: 52
- All three artifacts available: 50

## Filtering Rules

- `host_export_digest`: Keep first four top-level ## sections and demote headings.
- `host_export_references`: Keep only id/year/authors/title.
- `host_export_citation_analysis`: Keep report_md body, remove wrapper heading and trailing section, demote headings.
- `calibration_core_analysis`: Keep metadata + filtered digest; drop references and citation-analysis report.
- `calibration_external_literature`: Keep metadata + compact references table + citation-analysis report; drop digest.

## Statistics

### Core Full Context

| metric | chars | tokens |
| --- | ---: | ---: |
| count | 52 | 52 |
| median | 1582 | 967 |
| mean | 1871 | 1055 |
| p75 | 2320 | 1300 |
| p90 | 2676 | 1476 |
| p95 | 3398 | 1639 |
| max | 3920 | 1768 |

### External Full Context

| metric | chars | tokens |
| --- | ---: | ---: |
| count | 52 | 52 |
| median | 13474 | 4895 |
| mean | 15322 | 5263 |
| p75 | 22550 | 7566 |
| p90 | 26881 | 9854 |
| p95 | 30852 | 10260 |
| max | 64297 | 18751 |

### Digest Artifact

| metric | chars | tokens |
| --- | ---: | ---: |
| count | 52 | 52 |
| median | 1375 | 894 |
| mean | 1663 | 995 |
| p75 | 2092 | 1236 |
| p90 | 2450 | 1424 |
| p95 | 3171 | 1578 |
| max | 3665 | 1715 |

### Compact References

| metric | chars | tokens |
| --- | ---: | ---: |
| count | 46 | 46 |
| median | 5486 | 1666 |
| mean | 6590 | 1966 |
| p75 | 8174 | 2360 |
| p90 | 10102 | 2936 |
| p95 | 14061 | 4114 |
| max | 23816 | 6773 |

### Citation Analysis Report

| metric | chars | tokens |
| --- | ---: | ---: |
| count | 52 | 52 |
| median | 7886 | 3064 |
| mean | 9245 | 3459 |
| p75 | 14111 | 5236 |
| p90 | 17223 | 6560 |
| p95 | 19937 | 7339 |
| max | 48907 | 14334 |

## Recommended Constants

```json
{
  "basis": "core uses p90 full-context tokens; external_literature uses p75 full-context tokens because external context has high-tail variance; both measured with o200k_base and rounded up to nearest 250 tokens",
  "core_analysis_basis_quantile": "p90",
  "external_literature_basis_quantile": "p75",
  "core_analysis_full_context_tokens_per_paper": 1500,
  "external_literature_full_context_tokens_per_paper": 7750,
  "core_analysis_budget_tokens": 200000,
  "external_literature_budget_tokens": 200000,
  "safety_margin_ratio": 0.1,
  "usable_budget_tokens": 180000,
  "core_analysis_full_context_slot_count": 120,
  "external_literature_full_context_slot_count": 23
}
```
