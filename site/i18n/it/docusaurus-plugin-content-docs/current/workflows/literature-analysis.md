# Analisi della letteratura

## Scopo

Generare riassunti della letteratura, elenchi di riferimenti e rapporti di analisi delle citazioni da allegati PDF o Markdown.

**L'Analisi della letteratura è la pietra angolare della gestione della letteratura con agenti** — ogni articolo acquisito dovrebbe essere elaborato tramite questo Workflow. Stabilisce una base di conoscenza strutturata per ogni articolo e tutte le funzionalità avanzate come i grafi delle citazioni e la Sintesi degli argomenti dipendono dagli output di questo Workflow.

Questo Workflow chiama la skill `literature-analysis` sul backend Skill-Runner per eseguire un'analisi strutturata degli articoli accademici.

:::tip Migliori pratiche
- **Estrai prima il Markdown**: Prima di eseguire l'Analisi della letteratura, si consiglia di usare [MinerU](mineru) per convertire prima il PDF in Markdown. Il Markdown originale migliora significativamente la comprensione della struttura dell'articolo da parte dell'AI.
- **Inizializza prima il vocabolario dei tag**: Si consiglia di eseguire il [Bootstrapper dei tag](tag-bootstrapper) per inizializzare un vocabolario controllato di tag prima della tua prima Analisi della letteratura. Questo permette alla regolazione automatica dei tag nella pipeline di analisi di raggiungere la massima efficacia.
:::

## Casi d'uso

- Ottenere rapidamente un riassunto dei contenuti chiave quando si legge un nuovo articolo
- Raccogliere l'elenco completo dei riferimenti di un articolo
- Analizzare il contesto delle citazioni e le intenzioni di citazione di un articolo

## Vincoli di input

| Tipo di vincolo | Descrizione |
|-----------------|-------------|
| Unità di input | Allegato |
| Tipi accettati | `text/markdown`, `text/x-markdown`, `text/plain`, `application/pdf` |
| Limite per elemento padre | Al massimo 1 allegato |

### Metodi di attivazione

- Selezionare direttamente un allegato PDF o Markdown
- Selezionare l'elemento padre e il plugin espanderà automaticamente il primo allegato idoneo

## Flusso di esecuzione

```
1. Costruisci la richiesta
   └── Carica il file sorgente su Skill-Runner
       └── Invoca skill_id: "literature-analysis"

2. Elaborazione di Skill-Runner
   └── Analizza il contenuto del documento
       └── Genera tre output:
           ├── digest.md          (Riassunto della letteratura)
           ├── references.json    (Elenco dei riferimenti)
           └── citation_analysis.json (Analisi delle citazioni)

3. Restituisci i risultati
   └── Scarica il bundle (zip)
       └── Contiene result.json e artifacts/
```

### Modalità di esecuzione

Completamente automatico, non richiede intervento dell'utente. Basta inviare e attendere il completamento.

### Configurazione dell'esecuzione

- `execution.mode`: `auto` — Esecuzione automatica, non richiede intervento dell'utente
- `skillrunner_mode`: `auto` — Modalità non interattiva

## Durata stimata

| Scenario | Tempo stimato |
|----------|--------------|
| Formato dei riferimenti standard | 6-10 minuti |
| Formato dei riferimenti non standard | 12-18 minuti |

La durata dipende principalmente dal fatto che il formato dei riferimenti sia standard — più il formato è standardizzato (es. citazioni da ScienceDirect, IEEE e altre riviste principali), più rapida sarà l'analisi dell'AI. La lunghezza dell'articolo ha un impatto relativamente minore.

## Output

Dopo il completamento dell'esecuzione, vengono create **3 note di Zotero** sotto l'elemento padre:

### 1. Nota del riassunto

- Tipo: `data-zs-note-kind="digest"`
- Contenuto: Riassunto della letteratura renderizzato in HTML che copre il contesto della ricerca, i metodi, i risultati e le conclusioni
- Strategia di aggiornamento: Ogni esecuzione aggiorna la nota con lo stesso nome (sovrascrive se esiste già)

![Nota del riassunto dell'Analisi della letteratura](/img/docs/workflows/literature-analysis_digest.png)

:::info Informazioni sul contenuto della nota
Il contenuto visualizzato nella nota è **renderizzato** dai dati del backend. Modificare direttamente il contenuto della nota in Zotero **non** cambierà i dati effettivi del backend. Per modificare i risultati dell'analisi, usa la funzionalità [Esporta/Importa note](export-import-notes) per esportare, modificare e poi reimportare.
:::

### 2. Nota dei riferimenti

- Tipo: `data-zs-note-kind="references"`
- Contenuto: Tabella HTML dei riferimenti (#, Anno, Titolo, Autori, Fonte, Localizzatore)
- Strategia di aggiornamento: Ogni esecuzione aggiorna la nota con lo stesso nome

![Nota dei riferimenti dell'Analisi della letteratura](/img/docs/workflows/literature-analysis_references.png)

### 3. Nota dell'analisi delle citazioni

- Tipo: `data-zs-note-kind="citation-analysis"`
- Contenuto: Rapporto di analisi delle citazioni che include il contesto delle citazioni e la classificazione delle intenzioni di citazione
- Strategia di aggiornamento: Ogni esecuzione aggiorna la nota con lo stesso nome

![Nota dell'analisi delle citazioni dell'Analisi della letteratura](/img/docs/workflows/literature-analysis_citation-analysis.png)

## Parametri

| Parametro | Tipo | Descrizione | Predefinito |
|-----------|------|-------------|-------------|
| `language` | string | Lingua di output | `zh-CN` |
| `auto_tag_regulator` | boolean | Se attivare automaticamente il [Regolatore dei tag](tag-regulator) a cascata dopo l'analisi della letteratura. **Si consiglia di abilitarlo** | `true` |
| `auto_tag_infer_tag` | boolean | Quando si attiva la regolazione dei tag a cascata, se lasciare che l'AI inferisca nuovi tag (visibile solo quando `auto_tag_regulator` è abilitato) | `true` |

Valori disponibili per `language`: `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. È supportato anche l'inserimento personalizzato.

## Raccomandazioni sul modello

🔴 Si raccomandano modelli con **forte comprensione del testo**. Se il backend supporta la delega di sotto-agent (es. Claude Code, Codex), il riassunto, i riferimenti e l'analisi delle citazioni possono essere elaborati in parallelo, riducendo significativamente il tempo totale.

## Dipendenze

- **Backend**: Servizio Skill-Runner
- **Configurazione del backend**: Configurare un backend di tipo Skill-Runner nel Backend Manager
- **Skill**: La skill `literature-analysis` deve essere distribuita sul Skill-Runner

## Workflow correlati

- [Bootstrapper dei tag](tag-bootstrapper) — Inizializza un vocabolario controllato di tag prima della tua prima analisi
- [MinerU](mineru) — Converti prima il PDF in Markdown per la miglior qualità di analisi
- [Spiegatore interattivo della letteratura](literature-explainer) — Dialogo con l'AI per una comprensione approfondita della letteratura
- [Esporta/Importa note](export-import-notes) — Esporta gli artifact di analisi per la modifica o la migrazione tra istanze di Zotero
- [Regolatore dei tag](tag-regulator) — Esegui la regolazione dei tag in modo indipendente (l'Analisi della letteratura può attivarla automaticamente a cascata)
