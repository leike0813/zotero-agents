# Esporta/Importa note

## Scopo

Esportare e importare i tre tipi di note strutturate generate da `literature-analysis` (riassunto, riferimenti, analisi delle citazioni), facilitando la migrazione tra istanze di Zotero.

:::info Modifica dei risultati dell'analisi
Le note generate dall'[Analisi della letteratura](literature-analysis) sono **renderizzate** dai dati del backend; modificare direttamente il contenuto della nota non cambierà i dati del backend. Se hai bisogno di modificare i risultati dell'analisi, l'approccio corretto è: **Esporta note** → modifica i file esportati → usa **Importa note** per reimportare.
:::

## export-notes (Esporta note)

### Casi d'uso

- Condividere i risultati dell'analisi della letteratura con i collaboratori
- Importare i risultati dell'analisi in un'altra istanza di Zotero
- Eseguire il backup degli artifact di analisi della letteratura

### Vincoli di input

| Tipo di vincolo | Descrizione |
|-----------------|-------------|
| Unità di input | Elemento padre |
| Metodo di selezione | Supporta la selezione mista di elementi padre e tre tipi di note |
| Comportamento multi-selezione | Per la selezione multipla viene mostrata solo una finestra di selezione della directory di esportazione |

### Artifact esportati

| File | Descrizione |
|------|-------------|
| `digest.md` | Markdown del riassunto della letteratura |
| `references.json` | JSON dell'elenco dei riferimenti |
| `citation_analysis.json` | JSON dei dati di analisi delle citazioni |
| `citation_analysis.md` | Markdown del rapporto di analisi delle citazioni |
| `representative_image.jpg` | Immagine rappresentativa (quando la nota del riassunto contiene un'immagine incorporata) |

L'immagine rappresentativa viene inserita in `digest.md` come blocco di commento Markdown `zs:representative-image:v1`, referenziato utilizzando un percorso relativo nella stessa directory. Il fallimento dell'esportazione dell'immagine non blocca l'esportazione degli artifact di testo e JSON.

## Durata stimata

Completato in pochi secondi (operazioni su file puramente locali, nessun backend richiesto).

## import-note (Importa note)

### Casi d'uso

- Ripristinare i risultati dell'analisi della letteratura in un'altra istanza di Zotero
- Importare gli artifact di analisi condivisi dai collaboratori

### Vincoli di input

| Tipo di vincolo | Descrizione |
|-----------------|-------------|
| Unità di input | Singolo elemento padre |
| Metodo di importazione | Seleziona una directory contenente gli artifact esportati |

### Flusso di importazione

```
1. Seleziona la directory di importazione
   └── La directory dovrebbe contenere digest.md, references.json, citation_analysis.json

2. Validazione della struttura
   └── references.json e citation_analysis.json vengono sottoposti a validazione della struttura prima di diventare candidati
       └── Il fallimento della validazione mostra un avviso ma non blocca l'importazione degli altri artifact

3. Analisi dell'immagine
   └── Se digest.md contiene un blocco marcatore zs:representative-image:v1
       └── Analizza automaticamente l'immagine rappresentativa dalla stessa directory
       └── L'utente può anche selezionare o cancellare manualmente l'immagine rappresentativa

4. Scrittura
   └── Crea/aggiorna le note corrispondenti sotto l'elemento padre
```

Il fallimento dell'importazione dell'immagine non blocca l'importazione della nota del riassunto.

## Dipendenze

- Nessuna connessione backend richiesta
- Si basa solo sull'archiviazione locale di Zotero

## Workflow correlati

- [Analisi della letteratura](literature-analysis) — Genera i tre tipi di note esportabili
