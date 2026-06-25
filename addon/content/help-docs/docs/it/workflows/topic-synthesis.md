# Sintesi dell'argomento

## Scopo

Creare una Sintesi dell'argomento tramite una pipeline automatizzata in tre passaggi, eseguendo un'analisi e una sintesi sistematica di un gruppo di articoli correlati.

Corrispondente al flusso di creazione degli argomenti nel Synthesis Workbench, questo Workflow fornisce un'elaborazione end-to-end dal seed dell'argomento a un rapporto di analisi completo.

## Casi d'uso

- Creare un'analisi completa dell'argomento intorno a una direzione di ricerca
- Costruire automaticamente una tassonomia, affermazioni chiave, cronologia e direzioni future
- Generare un rapporto di analisi di sintesi strutturato

## Vincoli di input

| Tipo di vincolo | Descrizione |
|-----------------|-------------|
| Unità di input | workflow (non è necessario selezionare elementi) |
| Metodo di attivazione | Esegui dalla Dashboard o attivato nel Synthesis Workbench |

## Flusso di esecuzione

Questo Workflow è costituito da **3 skill eseguite in sequenza** che si passano automaticamente il testimone:

```
1. create-topic-synthesis-prepare
   └── Riceve il seed dell'argomento
       └── Crea l'intento dell'argomento
       └── Costruisce il workset degli articoli
       └── Prepara il contesto di analisi

2. topic-synthesis-core-enrichment
   └── Arricchimento principale
       └── Scrive la Tassonomia (sistema di classificazione)
       └── Costruisce la Cronologia
       └── Estrae le Affermazioni
       └── Analizza le direzioni future
       └── Genera lo schema del rapporto
       └── Completamento del grafo della conoscenza

3. topic-synthesis-finalize
   └── Determinazione della copertura
       └── Genera il riassunto del contesto esterno
       └── Suggerimenti di curatela
       └── Genera il riassunto finale dell'analisi
```

## Output

Dopo il completamento dell'esecuzione, i risultati della sintesi dell'argomento vengono scritti nell'archiviazione persistente del sistema di Sintesi e riflessi nelle viste Argomenti e Grafo del Synthesis Workbench.

Gli output specifici includono:

- **Metadati dell'argomento**: Nome, descrizione, ora di creazione
- **Tassonomia**: Sistema di classificazione gerarchica dell'argomento
- **Eventi della cronologia**: Eventi importanti organizzati cronologicamente
- **Affermazioni**: Affermazioni chiave estratte e le loro prove
- **Confronti**: Analisi comparativa multidimensionale
- **Direzioni future**: Suggerimenti per le direzioni di ricerca future
- **Copertura**: Analisi della copertura della letteratura
- **Rapporto**: Rapporto di analisi di sintesi

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_overview.webp" alt="Pagina panoramica della Sintesi dell&#39;argomento" title="Pagina panoramica della Sintesi dell&#39;argomento" loading="lazy" /><figcaption>Pagina panoramica della Sintesi dell&#39;argomento</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_taxonomy.webp" alt="Pagina Tassonomia della Sintesi dell&#39;argomento" title="Pagina Tassonomia della Sintesi dell&#39;argomento" loading="lazy" /><figcaption>Pagina Tassonomia della Sintesi dell&#39;argomento</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_claims.webp" alt="Pagina Affermazioni della Sintesi dell&#39;argomento" title="Pagina Affermazioni della Sintesi dell&#39;argomento" loading="lazy" /><figcaption>Pagina Affermazioni della Sintesi dell&#39;argomento</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_compare.webp" alt="Pagina Confronti della Sintesi dell&#39;argomento" title="Pagina Confronti della Sintesi dell&#39;argomento" loading="lazy" /><figcaption>Pagina Confronti della Sintesi dell&#39;argomento</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_future-directions.webp" alt="Pagina Direzioni future della Sintesi dell&#39;argomento" title="Pagina Direzioni future della Sintesi dell&#39;argomento" loading="lazy" /><figcaption>Pagina Direzioni future della Sintesi dell&#39;argomento</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_coverage.webp" alt="Pagina Copertura della Sintesi dell&#39;argomento" title="Pagina Copertura della Sintesi dell&#39;argomento" loading="lazy" /><figcaption>Pagina Copertura della Sintesi dell&#39;argomento</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_report.webp" alt="Pagina Rapporto della Sintesi dell&#39;argomento" title="Pagina Rapporto della Sintesi dell&#39;argomento" loading="lazy" /><figcaption>Pagina Rapporto della Sintesi dell&#39;argomento</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_references.webp" alt="Pagina Riferimenti della Sintesi dell&#39;argomento" title="Pagina Riferimenti della Sintesi dell&#39;argomento" loading="lazy" /><figcaption>Pagina Riferimenti della Sintesi dell&#39;argomento</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_subgraph.webp" alt="Sottografo degli articoli della Sintesi dell&#39;argomento" title="Sottografo degli articoli della Sintesi dell&#39;argomento" loading="lazy" /><figcaption>Sottografo degli articoli della Sintesi dell&#39;argomento</figcaption></figure>

## Parametri

| Parametro | Tipo | Descrizione | Predefinito |
|-----------|------|-------------|-------------|
| `topicSeed` | string | Seed dell'argomento che descrive l'argomento da creare | — |
| `language` | string | Lingua di output | `auto` |

### Descrizione di language

- `auto`: Rileva automaticamente (tipicamente usa la lingua dell'interfaccia del plugin)
- `zh-CN`: Cinese
- `en-US`: Inglese

## Dipendenze

- **Backend**: Backend ACP
- **Sistema di Sintesi**: Richiede che il Synthesis Workbench sia inizializzato
- **Articoli della libreria**: Si consiglia di avere già un numero sufficiente di elementi di articoli correlati nella libreria

:::tip Preparazione consigliata
Prima di creare un Argomento, si consiglia di:
1. Assicurarsi che tutti gli articoli correlati siano stati elaborati tramite [Analisi della letteratura](#doc/workflows%2Fliterature-analysis)
2. Assicurarsi che gli articoli correlati siano stati elaborati tramite [Regolatore dei tag](#doc/workflows%2Ftag-regulator)
3. Eseguire **Corrispondenza avanzata** (deduplicazione della corrispondenza avanzata delle citazioni) nella pagina Indice del Synthesis Workbench
4. Gestire tutti gli elementi di approvazione nella pagina Revisione (ricordarsi di "Applicare" le decisioni in sospeso)

Le relazioni accurate del grafo delle citazioni influiscono direttamente sulla qualità del calcolo dell'importanza degli articoli nella Sintesi dell'argomento (PageRank, punteggio frontier, ecc.), migliorando così la qualità complessiva della panoramica dell'Argomento.
:::

## Durata stimata

| Dimensione dell'argomento | Tempo stimato |
|---------------------------|--------------|
| Argomento piccolo (≤10 articoli) | 8-12 minuti |
| Argomento medio (10-30 articoli) | 12-18 minuti |
| Argomento grande (30+ articoli) | 18-25 minuti |

Se ci sono molti articoli, si consiglia di utilizzare invece la funzionalità di aggiornamento per l'iterazione incrementale.

## Raccomandazioni sul modello

🔴 Si raccomandano modelli con **forte comprensione del testo + contesto lungo**. La Sintesi dell'argomento richiede un'analisi completa di un gran numero di riassunti di articoli, relazioni di citazione, tag e conoscenza concettuale, rendendola un'attività computazionalmente intensiva. Se il backend supporta la delega di sotto-agent, la pipeline a più passaggi può essere eseguita in modo più efficiente.

## Workflow correlati

- [Panoramica del Synthesis Workbench](#doc/synthesis%2Findex) — Guida all'uso del Synthesis Workbench
- [Strutturazione della letteratura per il manoscritto](#doc/workflows%2Fmanuscript-literature-framing) — Scrivi le introduzioni degli articoli basandoti sui risultati della Sintesi dell'argomento
