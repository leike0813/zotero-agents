# Strutturazione della letteratura per il manoscritto

## Scopo

Assistere nella scrittura delle sezioni Introduzione e Lavori correlati di un articolo accademico. Tramite un dialogo interattivo, chiarisce il posizionamento dell'articolo, raccoglie la letteratura pertinente, analizza le strutture di scrittura e genera bozze LaTeX.

## Casi d'uso

- Redigere un articolo e aver bisogno di organizzare la struttura della letteratura
- Determinare il posizionamento e le innovazioni dell'articolo
- Generare bozze LaTeX per le sezioni Introduzione e Lavori correlati

## Vincoli di input

| Tipo di vincolo | Descrizione |
|-----------------|-------------|
| Unità di input | workflow (non è necessario selezionare elementi) |
| Metodo di attivazione | Esegui direttamente dalla Dashboard |

## Flusso di esecuzione

Questo Workflow viene eseguito in modo interattivo, procedendo attraverso le seguenti fasi:

```
1. Conferma delle informazioni dell'articolo
   └── Conferma il titolo dell'articolo e l'ambito della ricerca
       └── Chiarisce la rivista/sede di destinazione e lo stile di scrittura

2. Raccolta del materiale
   └── Recupera la letteratura pertinente dalla libreria di Zotero
       └── Ottiene i metadati della letteratura e le informazioni sulle citazioni

3. Analisi della struttura multi-prospettica
   └── Analizza il posizionamento dell'articolo nel campo
       └── Identifica gli angoli di scrittura disponibili e i fili narrativi

4. Piano di scrittura
   └── Genera lo schema della struttura dell'Introduzione
       └── Genera il piano di organizzazione dei Lavori correlati

5. Generazione della bozza
   └── Produce la bozza LaTeX dell'Introduzione
       └── Produce la bozza LaTeX dei Lavori correlati
       └── Include la mappatura delle citazioni e l'inventario delle prove
```

### Dettagli dell'interazione

- Ogni fase richiede la conferma dell'utente prima di procedere
- L'utente può adattare la direzione durante la conversazione
- Lo stato di avanzamento può essere monitorato nella Dashboard

## Durata stimata

Dipende dal numero di turni di conversazione e dalla dimensione della libreria di letteratura. La fase di analisi dell'AI richiede circa 5-10 minuti, più il tempo di conferma dell'utente per ogni fase.

## Output

Dopo il completamento dell'esecuzione, gli artifact possono essere scritti in Zotero (come note) tramite l'hook Apply Result o scaricati:

| Artifact | Formato | Descrizione |
|----------|---------|-------------|
| `introduction.tex` | LaTeX | Bozza dell'Introduzione |
| `related-work.tex` | LaTeX | Bozza dei Lavori correlati |
| `framing-analysis.json` | JSON | Analisi della struttura multi-prospettica |
| `writing-plan.json` | JSON | Piano di scrittura |
| `evidence-inventory.json` | JSON | Inventario delle prove/citazioni |
| `citation-map.json` | JSON | Relazioni di mappatura delle citazioni |
| `intent-brief.json` | JSON | Riepilogo del posizionamento dell'articolo |

:::tip Accesso agli artifact
Le bozze LaTeX generate e altri artifact possono essere trovati nell'**area degli artifact della Dashboard**. Puoi posizionare direttamente gli artifact nel tuo manoscritto LaTeX o esportarli per un'ulteriore elaborazione.
:::

## Parametri

| Parametro | Tipo | Descrizione | Predefinito |
|-----------|------|-------------|-------------|
| `paperTitle` | string | Titolo dell'articolo | — |
| `language` | string | Lingua di output | `auto` |
| `targetVenue` | string | Rivista/sede di destinazione (opzionale) | Vuoto |
| `articleType` | string | Tipo di articolo | `original research` |
| `stylePreference` | string | Preferenza dello stile di scrittura (opzionale) | Vuoto |

### Esempi di stile di scrittura

- `concise`: Stile conciso
- `IEEE-like`: Stile IEEE
- `Nature-like`: Stile Nature
- `Chinese draft`: Bozza in cinese

## Dipendenze

- **Backend**: Backend ACP
- **Libreria di Zotero**: Richiede elementi di articoli correlati nella libreria

:::tip Workflow consigliato
Per ottenere i migliori risultati, si consiglia di completare la seguente preparazione prima di eseguire questo Workflow:
1. Raccogliere e acquisire un numero sufficiente di articoli correlati
2. Eseguire [Analisi della letteratura](literature-analysis) + [Regolatore dei tag](tag-regulator) su tutti gli articoli
3. Eseguire la Corrispondenza avanzata nel Synthesis Workbench e gestire gli elementi di approvazione
4. Creare diverse [Sintesi dell'argomento](topic-synthesis) correlate
:::

## Raccomandazioni sul modello

🟡 Si raccomandano modelli con **contesto lungo**. La scrittura dell'Introduzione e dei Lavori correlati richiede l'integrazione di riassunti, analisi delle citazioni e risultati della Sintesi dell'argomento da un gran numero di articoli, ponendo elevate richieste sulla finestra di contesto.

## Workflow correlati

- [Analisi della letteratura](literature-analysis) — Stabilisce una base di conoscenza strutturata per gli articoli
- [Sintesi dell'argomento](topic-synthesis) — Crea prima le sintesi dell'argomento, poi scrivi l'articolo basandoti sui risultati dell'analisi
