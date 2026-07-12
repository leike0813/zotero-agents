# Literature Translator

## Scopo

Tradurre un allegato letterario (Markdown o PDF) in una lingua di destinazione specificata, producendo un file Markdown tradotto e dati di allineamento bilingue. Si consiglia vivamente di convertire prima i PDF in Markdown utilizzando [MinerU](mineru) per una qualità di traduzione significativamente migliore.

## Input

| Parametro | Richiesto | Descrizione |
| --- | --- | --- |
| `target_language` | No | Lingua di destinazione (predefinita: `zh-CN`). Supportate: `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. Sono accettati valori personalizzati. |
| `mode` | No | Modalità di traduzione: `fast` (predefinita) o `high_quality` (più lenta). |

Tipi di allegato accettati: `text/markdown`, `text/x-markdown`, `text/plain`, `application/pdf`.

### Metodi di attivazione

- Selezionare direttamente un allegato (PDF o Markdown)
- Selezionare un elemento padre — il plugin trova automaticamente il primo allegato qualificante
- Viene elaborato solo un allegato per elemento padre
- Gli elementi con una traduzione esistente nella lingua di destinazione vengono automaticamente saltati

## Comportamento

1. Risolvere l'allegato target dalla selezione (allegato diretto o primo allegato qualificante sotto l'elemento padre).
2. Verificare se esiste già un artefatto di traduzione per la lingua di destinazione; in tal caso, saltare.
3. Inviare il lavoro di traduzione al backend Skill-Runner con lo skill `literature-translator`.
4. La pipeline di traduzione esegue più fasi: analisi di allineamento, esecuzione della traduzione e verifica QA.
5. Scrivere il file Markdown tradotto nella stessa directory della fonte, denominato `<source-name>_<target-language>.md`, e creare un allegato collegato sotto l'elemento padre.

Il workflow è completamente automatico e non si ferma per l'intervento dell'utente.

## Output e applicazione

| Artefatto | Descrizione |
|----------|-------------|
| Markdown tradotto | Scritto accanto al file sorgente come `<source-name>_<target-language>.md` |
| Allegato collegato | Creato sotto l'elemento padre che punta al Markdown tradotto |
| Dati di allineamento | JSON di allineamento bilingue nello spazio di lavoro dello skill |
| Glossario | JSON del glossario estratto nello spazio di lavoro dello skill |
| Rapporto QA | JSON del rapporto di assicurazione qualità nello spazio di lavoro dello skill |

## Durata stimata

| Dimensione del file | Tempo stimato |
|-----------|---------------|
| Articolo breve (≤10 pagine) | 3–5 minuti |
| Standard (10–30 pagine) | 5–10 minuti |
| Articolo lungo (30+ pagine) | 10–18 minuti |

## Raccomandazione del modello

Si raccomanda un modello con capacità di delega dei subagenti. La pipeline di traduzione include fasi di analisi di allineamento, esecuzione della traduzione e verifica QA. La delega dei subagenti consente l'elaborazione parallela di queste sottoattività, migliorando significativamente l'efficienza e la coerenza della traduzione.

## Dipendenze

- **Backend**: Skill-Runner
- **Skill**: `literature-translator`

## Workflow correlati

- [MinerU PDF Parsing](mineru) — Convertire prima il PDF in Markdown per una migliore qualità di traduzione
- [Literature Analysis](literature-analysis) — Generare sintesi letteraria e artefatti di analisi
