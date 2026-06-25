# Panoramica di Synthesis Workbench

Synthesis Workbench è una piattaforma di analisi approfondita della letteratura fornita da Zotero Agents. Trasforma la vostra libreria in una rete di conoscenza strutturata, supportando la sintesi per argomenti, l'analisi delle citazioni, la gestione dei concetti e la gestione del vocabolario controllato.

![Home di Synthesis Workbench](/img/docs/synthesis/home.png)

## Come aprire

1. Aprire Dashboard / Synthesis Workspace tramite il **pulsante nella barra degli strumenti** o il **menu**
2. Passare alla vista **Synthesis** nel Workspace Tab

## Tutte le superfici (pagine)

Synthesis Workbench è composto da 8 superfici, ognuna delle quali fornisce una diversa vista funzionale:

| Superficie | Funzione | Documentazione |
|------------|----------|----------------|
| **Home** | Dashboard panoramica della libreria: informazioni sulla libreria (articoli registrati / numero di argomenti / nodi del grafo), pannello di stato della sincronizzazione Git, elenco di card degli argomenti di tendenza | [Dettagli](home) |
| **Topics** | Elenco e gestione degli argomenti: 3 modalità di visualizzazione (grafo / griglia / elenco), creazione e aggiornamento degli argomenti, ricerca e ordinamento degli argomenti | [Dettagli](topic-synthesis) |
| **Index** | Indice dei riferimenti canonici: vista registro degli articoli (elenco articoli + righe di citazione + stato di associazione), vista riferimenti canonici (ricerca / unione / reindirizzamento / deduplicazione) | [Dettagli](index-and-citation) |
| **Review** | Hub di revisione: 3 sotto-schede — revisione delle corrispondenze di citazione (accetta/rifiuta proposte di associazione), revisione dei concetti, revisione delle relazioni del grafo degli argomenti | [Dettagli](review) |
| **Graph** | Visualizzazione del grafo delle citazioni (forza-diretto / radiale / componenti — 3 layout), con filtraggio per argomento e interazione con nodi/archi | [Dettagli](index-and-citation) |
| **Tags** | Gestione del vocabolario controllato dei tag + approvazione dei suggerimenti di tag automatici | [Dettagli](tags) |
| **Concepts** | Gestione della base di conoscenza dei concetti: struttura a quattro livelli di concetti / sensi / alias / relazioni, sovrapponibile al grafo degli argomenti e al lettore | [Dettagli](concepts) |
| **Reader** | Lettore degli argomenti: pagina completa di dettaglio dell'argomento con 8 sotto-pagine (Panoramica, Tassonomia, Affermazioni, Confronto, Direzioni future, Copertura, Riferimenti, Report) | [Dettagli](topic-synthesis) |

## Concetti fondamentali

### Canonical Store

Il Canonical Store è l'archivio sottostante del grafo della conoscenza per il sistema Synthesis. Memorizza file JSON indirizzabili per contenuto nella directory dei dati di Zotero.

**Posizione di archiviazione:** `<directory dati Zotero>/zotero-agents/data/synthesis/`

**Struttura delle directory:**

```
synthesis/
├── topics/             # Artifact strutturati per la sintesi degli argomenti
├── concepts/           # Base di conoscenza dei concetti
├── topic-graph/        # Nodi e archi del grafo degli argomenti
├── citation-graph/     # Snapshot del grafo delle citazioni
├── tags/               # Vocabolario controllato dei tag
├── sync/               # Working tree per la sincronizzazione Git
└── state/              # Stato runtime (transazioni, ricevute, cache, ecc.)
```

Ogni file utilizza un formato a busta JSON (CanonicalEnvelope) che include un ID schema, un numero di versione, un timestamp e un corpo dati validato secondo lo schema. Le operazioni di scrittura utilizzano semantica transazionale: i dati vengono prima predisposti nella directory delle transazioni, promossi alla posizione canonica dopo la validazione riuscita, e ripristinati automaticamente in caso di fallimento.

### Reference Sidecar

Un Reference Sidecar è un indice degli artifact associati a ciascun articolo. Quando un workflow elabora un elemento di letteratura e genera un riassunto, un elenco di riferimenti e un'analisi delle citazioni, questi artifact vengono allegati all'elemento come note strutturate (Zotero Notes). Il sistema Sidecar esegue la scansione di queste note e registra lo stato degli artifact (completo / parziale / mancante) nell'indice.

**Ciclo di scansione del Sidecar:** La scansione del sidecar viene attivata nei seguenti momenti:

- Al completamento dell'esecuzione di un workflow con scrittura degli artifact
- Quando viene attivata un'operazione esplicita di aggiornamento del sidecar
- Quando il sistema rileva dati sidecar obsoleti all'avvio

**Tipi di artifact:**

| Artifact | Descrizione |
|----------|-------------|
| `digest` | Riassunto dell'articolo (Markdown) |
| `references` | Elenco dei riferimenti (JSON) |
| `citation_analysis` | Report di analisi delle citazioni (JSON) |

I dati del sidecar fungono da input principale per l'Indice dei Riferimenti Canonici — il sistema estrae i record di citazione dall'artifact dei riferimenti, stabilisce i riferimenti canonici e poi tenta di abbinarli e associarli agli elementi della libreria.

### Flusso dei dati

```
Libreria Zotero
    │
    ├──→ Esecuzione Workflow (Analisi letteratura / Lettura approfondita)
    │         │
    │         ↓
    │   Note Artifact (Riassunto / Riferimenti / Analisi citazioni)
    │         │
    │         ↓
    │   Reference Sidecar ← Scansione stato artifact
    │         │
    │         ├──→ Indice Riferimenti Canonici
    │         │         │
    │         │         ├──→ Associazione Citazioni (Associazione a elementi Zotero)
    │         │         └──→ Grafo delle Citazioni
    │         │
    │         └──→ Sintesi degli Argomenti
    │                   │
    │                   ├──→ Grafo degli Argomenti (Relazioni tra argomenti)
    │                   └──→ Associazioni Concetti (Base di conoscenza concetti)
    │
    └──→ Git Sync ←→ Repository Remoto (Controllo versione e backup)
```

## Prerequisiti

L'utilizzo di Synthesis Workbench richiede:

- Un backend [Skill-Runner](../backends/skill-runner) configurato (per eseguire i workflow di sintesi)
- Elementi articolo già presenti nella libreria

## Prossimi passi

- [Dashboard Home](home) — Visualizzare la panoramica della libreria e lo stato della sincronizzazione
- [Gestione Tag](tags) — Gestire il vocabolario controllato dei tag
- [Indice e Grafo delle Citazioni](index-and-citation) — Conoscere l'indicizzazione dei riferimenti e le reti di citazioni
- [Creare una Sintesi di Argomento](topic-synthesis) — Creare analisi per argomento
- [Hub di Revisione](review) — Revisionare le corrispondenze di citazione, i concetti e le proposte del grafo degli argomenti
- [Base di Conoscenza dei Concetti](concepts) — Gestire i concetti fondamentali
- [Git Sync](git-sync) — Configurare la sincronizzazione e il backup dei dati
