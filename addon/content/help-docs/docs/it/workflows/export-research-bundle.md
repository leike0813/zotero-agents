# Export Research Bundle

## Scopo

Assemblare automaticamente un bundle di ricerca di sola lettura in Dashboard Products dalla libreria Zotero esistente e dal contesto Synthesis, basato su un intento di articolo dichiarato. Il bundle raccoglie argomenti pertinenti, articoli principali e articoli correlati con i loro artefatti di analisi disponibili.

## Input

| Parametro | Richiesto | Descrizione |
| --- | --- | --- |
| `paperTitle` | Sì | Titolo di lavoro del manoscritto utilizzato per trovare materiali di ricerca. |
| `researchContent` | Sì | Problema di ricerca, metodi, ambito e contributo previsto. |
| `articleType` | No | Tipo di manoscritto (predefinito: `original research`). |
| `maxTopics` | No | Numero massimo di argomenti pertinenti da includere, intervallo 0–5 (predefinito: 5). |
| `maxCorePapers` | No | Numero massimo di articoli principali, intervallo 1–20 (predefinito: 20). |
| `maxRelatedPapers` | No | Totale massimo di articoli correlati inclusi i principali, intervallo 1–80 (predefinito: 80). |

Non è richiesta la selezione di elementi Zotero.

## Comportamento

1. Ricevere i parametri di intento dell'articolo dall'utente.
2. Scoprire materiali candidati da Synthesis Topics esistenti, elementi della libreria Zotero e contesto del grafo di citazione disponibile.
3. Eseguire una valutazione delimitata per distinguere gli articoli principali da quelli correlati.
4. Assemblare il Research Bundle con rapporti sugli argomenti, metadati bibliografici e artefatti di analisi v2 disponibili (sintesi, riferimenti, analisi delle citazioni, contenuto delle conversazioni).
5. Per gli articoli principali, preferire la fonte Markdown con immagini locali; ripiegare su PDF; registrare un avviso se nessuno è disponibile.
6. Registrare il bundle come prodotto di sola lettura in Dashboard Products.

L'indisponibilità di argomento, grafo, artefatto di analisi o fonte si degrada elegantemente — il workflow continua con qualsiasi evidenza sia ancora leggibile e registra diagnostica e avvisi. Se nessun articolo soddisfa i criteri, l'esecuzione termina senza registrare un prodotto.

## Output e applicazione

Il Research Bundle è registrato in Dashboard Products come artefatto di sola lettura. La sua struttura:

| Percorso | Descrizione |
|------|-------------|
| `README.md` | Punto di ingresso per agenti e umani con ordine di lettura suggerito, nomenclatura dei file, indice di argomento/articolo |
| `manifest.json` | Inventario leggibile dalla macchina dei percorsi degli artefatti v2, provenienza, integrità dei file e diagnostica |
| `topics/<topic-id>/report.md` | Rapporto di sintesi dell'argomento (quando disponibile) |
| `papers/<paper-id>/metadata.json` | Metadati bibliografici portabili per articolo |
| `papers/<paper-id>/source.md` | Fonte Markdown (quando disponibile) |
| `papers/<paper-id>/digest-*.md` | Artefatti di sintesi Literature Analysis (quando disponibili) |

Solo le directory semantiche `topics/` e `papers/` vengono utilizzate insieme ai file radice. Le immagini Markdown sono incluse solo quando il loro percorso locale risolto cade all'interno dell'albero delle directory del file Markdown; le immagini fuori dall'albero o mancanti mantengono i loro collegamenti originali ma non sono registrate come file di prodotto.

## Durata stimata

Dipende dalla dimensione della libreria, dal numero di candidati, dalla disponibilità di argomenti/grafi e dalla velocità di risposta del backend. I progressi e i risultati sono visibili nel pannello di esecuzione.

## Raccomandazione del modello

Si raccomanda un modello con forte comprensione semantica e capacità di chiamata di strumenti. Il compito richiede di giudicare la rilevanza di argomenti e articoli rispetto all'intento dell'articolo e di utilizzare correttamente il contesto Zotero e Synthesis di sola lettura.

## Dipendenze

- **Backend**: Skill-Runner
- **Skill**: `export-research-bundle`
- **Host Bridge**: Richiede l'autorizzazione per leggere il contesto Zotero e Synthesis

## Workflow correlati

- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — Generare artefatti di sintesi e analisi delle citazioni che possono essere inclusi nel bundle
- [Literature Search & Ingest](#doc/workflows%2Fliterature-search-ingest) — Cercare e acquisire letteratura mancante prima di assemblare il bundle
- [Export/Import Literature Bundle](#doc/workflows%2Fexport-import-literature-bundle) — Esportare bundle ZIP portabili di elementi Zotero (scopo diverso)
