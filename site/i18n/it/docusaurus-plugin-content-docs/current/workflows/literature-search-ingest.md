# Ricerca e acquisizione della letteratura

## Scopo

Cercare letteratura accademica tramite l'AI e acquisire i risultati direttamente in Zotero. Supporta più modalità di ricerca con conferma interattiva prima di eseguire l'operazione di acquisizione.

## Casi d'uso

- Cercare e acquisire in batch letteratura rilevante quando si esplora un nuovo argomento
- Inserire il titolo, il DOI, l'ID arXiv o il PMID di un articolo noto per l'importazione rapida
- Espandere la ricerca di letteratura correlata a partire da un articolo seed

## Vincoli di input

| Tipo di vincolo | Descrizione |
|-----------------|-------------|
| Unità di input | workflow (non è necessario selezionare elementi) |
| Metodo di attivazione | Esegui dal menu contestuale o dalla Dashboard, non è necessario pre-selezionare elementi |

## Modalità di ricerca

| Modalità | Descrizione |
|----------|-------------|
| `auto` | Determina automaticamente la modalità di ricerca più adatta (predefinita) |
| `topic_expansion` | Cerca per direzione di ricerca o argomento per trovare letteratura correlata |
| `paper_seed_expansion` | Espande la ricerca a partire da un articolo seed |
| `targeted_ingest` | Localizza e acquisisce con precisione un singolo articolo |

## Flusso di esecuzione

```
1. Fase di conferma del piano
   └── Legge la libreria di Zotero e il contesto di Sintesi
       └── Determina automaticamente la modalità di ricerca (modalità auto)
       └── Presenta il piano di ricerca all'utente
       └── Attende la conferma dell'utente

2. Fase di ricerca (senza acquisizione)
   └── Cerca letteratura candidata secondo il piano confermato
       └── Visualizza l'elenco dei risultati della ricerca
       └── L'utente seleziona la letteratura da acquisire

3. Fase di acquisizione
   └── Acquisisce gli articoli uno per uno tramite zotero-bridge
       └── Include l'importazione dei metadati e degli allegati PDF
       └── Visualizza lo stato di avanzamento dell'acquisizione

4. Completamento
   └── Produce un riepilogo dei risultati dell'acquisizione
       └── Include informazioni sugli elementi riusciti/falliti
```

### Dettagli dell'interazione

- Questo Workflow viene eseguito in modalità **interattiva**, richiedendo la conferma dell'utente in punti chiave
- Conferma del piano: Dopo che l'AI presenta il piano di ricerca, l'utente lo conferma o lo adatta
- Conferma dell'elenco: Dopo che i risultati della ricerca vengono visualizzati, l'utente seleziona gli elementi da acquisire
- Lo stato di avanzamento dell'esecuzione può essere monitorato nella Dashboard

## Raccomandazioni sul modello

🔴 **Deve** avere funzionalità di ricerca web. Il cuore di questo Workflow è la ricerca di letteratura accademica online — i modelli senza funzionalità di ricerca web non possono eseguire questa attività.
🟢 La capacità di ragionamento del modello non deve essere particolarmente forte — la ricerca e l'acquisizione sono essenzialmente attività di recupero e chiamata di strumenti, che possono essere gestite da modelli leggeri.

## Output

- I risultati della ricerca vengono acquisiti direttamente come elementi di Zotero
- Tenta automaticamente di scaricare gli allegati PDF (best-effort)
- È possibile specificare una Collezione di destinazione per la categorizzazione

## Parametri

| Parametro | Tipo | Descrizione | Predefinito |
|-----------|------|-------------|-------------|
| `query` | string | Argomento di ricerca, direzione di ricerca, titolo dell'articolo, DOI, ID arXiv, PMID, ecc. | — |
| `searchMode` | string | Modalità di ricerca | `auto` |
| `targetCollection` | string | Collezione di destinazione (opzionale) | Vuoto |

### Valori disponibili per searchMode

- `auto`: Determina automaticamente
- `topic_expansion`: Espansione dell'argomento
- `paper_seed_expansion`: Espansione da articolo seed
- `targeted_ingest`: Acquisizione mirata

## Dipendenze

- **Backend**: Backend ACP (richiede il supporto del protocollo ACP)
- **Skill**: La skill `literature-search-ingest` deve essere distribuita sul backend

## Workflow correlati

- [Analisi della letteratura](literature-analysis) — Genera riassunti per la letteratura acquisita
