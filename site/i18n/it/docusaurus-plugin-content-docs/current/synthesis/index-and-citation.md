# Indice e Grafo delle Citazioni

## Superficie Index

Nella pagina Synthesis Workbench → Index, è possibile gestire l'Indice dei Riferimenti Canonici. La superficie Index contiene **due sotto-viste**:

### Vista Registry

Mostra un elenco di tutti gli articoli tracciati nella libreria, con ogni riga che mostra un articolo e il suo stato di copertura:

- **Informazioni sull'articolo**: Titolo, autore, anno
- **Copertura**: Completa / Parziale / Mancante (stato di copertura dei tre tipi di artifact: riassunto, riferimenti, analisi delle citazioni)
- **Espandi riga**: Quando espansa, mostra l'elenco dei riferimenti dell'articolo, con ogni citazione contrassegnata dal suo stato di associazione (non associata / candidata / accettata / rifiutata)
- **Filtro**: Filtrare per ambito (tutti / libreria / citati), copertura o ricerca

![Vista Registry dell'Indice di Synthesis](/img/docs/synthesis/index.png)

### Vista Riferimenti Canonici

Visualizzata quando lo strumento di indicizzazione attivo viene cambiato in "Revise Canonical":

- **Elenco Riferimenti Canonici**: Record di riferimenti canonici deduplicati
- **Ricerca e filtro**: Filtrare per stato di associazione, visibilità nel grafo, stato di reindirizzamento o esistenza di candidati duplicati
- **Azioni**: Modifica dei metadati, unione di riferimenti duplicati, creazione di reindirizzamenti, visualizzazione degli elementi di revisione

![Vista Revisione Riferimenti Canonici dell'Indice di Synthesis](/img/docs/synthesis/index_canonical-revision.png)

## Indice dei Riferimenti Canonici

L'Indice dei Riferimenti Canonici è l'indice centrale del sistema Synthesis, che esegue la deduplicazione e la canonicalizzazione di tutti i riferimenti dagli articoli nella libreria. Ottiene i dati grezzi delle citazioni dal Reference Sidecar (vedere la sezione "Reference Sidecar" nella [Panoramica](/synthesis)) e forma l'indice attraverso estrazione, canonicalizzazione e associazione delle corrispondenze.

### Funzionalità

- **Ricerca full-text**: Cercare tra tutti i riferimenti canonicalizzati
- **Modifica metadati**: Modificare i metadati dei record di citazione
- **Unione**: Unire record di riferimento duplicati (crea automaticamente reindirizzamenti)
- **Reindirizzamento**: Puntare un riferimento a un altro record canonico
- **Revisione**: Visualizzare gli elementi di revisione qualitativa per la corrispondenza delle citazioni
- **Deduplicazione**: Scoprire potenziali riferimenti duplicati

### Tipi di record di riferimento

| Tipo | Descrizione |
|------|-------------|
| **Associato** | Collegato a un elemento nella libreria Zotero |
| **Esterno** | Letteratura nota non presente nella libreria Zotero corrente |
| **Non risolto** | Estratto dai riferimenti ma non ancora identificato |

## Pipeline di corrispondenza dei riferimenti

La corrispondenza dei riferimenti è il processo di associazione automatica tra i riferimenti estratti dagli articoli e gli elementi nella libreria Zotero. Il sistema utilizza un **modello a due stadi** per bilanciare prestazioni e accuratezza.

### Modello a due stadi

#### Stadio 1: Aggiornamento leggero del Sidecar

Viene eseguito durante le operazioni regolari (ad es., dopo l'applicazione di un riassunto), scansiona lo stato del sidecar, confronta gli hash degli artifact di citazione ed elabora solo i riferimenti che sono cambiati. **Non esegue deduplicazione avanzata né costruzione dell'indice**, effettua solo un'assegnazione canonica e un'associazione leggere.

- Trigger: Al completamento dell'esecuzione di un workflow con scrittura degli artifact, o tramite operazione esplicita di aggiornamento
- Ambito: Incrementale (solo riferimenti modificati)
- Algoritmo: Corrispondenza semplice per identificatore (DOI, arXiv, ISBN)

#### Stadio 2: Corrispondenza avanzata delle citazioni

Un'operazione di corrispondenza approfondita attivata esplicitamente. Costruisce un indice completo di corrispondenza delle citazioni ed esegue algoritmi completi di corrispondenza e deduplicazione.

- Trigger: Attivazione manuale da parte dell'utente, manutenzione periodica
- Ambito: Completo
- Algoritmo: Corrispondenza multi-strategia + deduplicazione per clustering

:::caution Nota sulle prestazioni
La corrispondenza avanzata delle citazioni, l'aggiornamento dell'indice e la ricostruzione del Grafo delle Citazioni sono operazioni ad alta intensità computazionale. Poiché Zotero utilizza un'architettura a processo host singolo, queste operazioni possono causare brevi rallentamenti dell'interfaccia durante l'esecuzione. Si prega di attendere. È previsto di affrontare questo problema in una futura rifattorizzazione architetturale.
:::

### Strategie di corrispondenza

| Strategia | Base di corrispondenza | Confidenza | Descrizione |
|-----------|----------------------|------------|-------------|
| Corrispondenza DOI | Identificatore DOI | Deterministica | Corrispondenza esatta, accettata automaticamente |
| Corrispondenza arXiv | ID arXiv | Deterministica | Corrispondenza esatta, accettata automaticamente |
| Corrispondenza ISBN | Numero ISBN | Deterministica | Corrispondenza esatta, accettata automaticamente |
| Similarità del titolo | Corrispondenza fuzzy del titolo | Alta / Media / Bassa | Utilizza titoli standardizzati e titoli compatti per il calcolo della similarità |
| Autore + Anno | Nomi degli autori e anno di pubblicazione | Media / Bassa | Combina normalizzazione degli autori e intervallo di anni per la corrispondenza |

### Livelli di confidenza

| Livello | Descrizione | Azione raccomandata |
|---------|-------------|---------------------|
| `deterministic` | Corrispondenza deterministica | Accettazione automatica |
| `high` | Alta confidenza | Accettabile |
| `medium` | Confidenza media | Si raccomanda la revisione |
| `low` | Bassa confidenza | Richiede revisione |
| `review` | Richiede giudizio umano | Revisione obbligatoria |

### Deduplicazione per clustering

Lo stadio di corrispondenza avanzata esegue la deduplicazione per clustering sui riferimenti canonici. Il processo algoritmico:

1. Costruisce un record di deduplicazione per ogni riferimento canonico (incluso il filtro di ammissibilità e l'analisi del rumore bibliografico)
2. Il confronto a coppie produce archi di cluster (corrispondenza esatta per identificatore, corrispondenza canonica per titolo, corrispondenza fuzzy per titolo, ecc.)
3. Gli archi vengono aggregati in cluster e sotto-cluster
4. Genera reindirizzamenti automatici o proposte di revisione per la deduplicazione

Vincolo di sicurezza: Le corrispondenze a bassa confidenza (ad es., `contained_extension_risk`) non attivano mai reindirizzamenti automatici e richiedono la revisione dell'utente.

### Superficie di revisione

Nell'[Hub di Revisione](review), è possibile visualizzare ed elaborare le proposte di corrispondenza delle citazioni, accettandole o rifiutandole una per una.

## Grafo delle Citazioni

Il Grafo delle Citazioni visualizza gli articoli nella libreria e i loro riferimenti come un grafo di rete. I dati del grafo sono costruiti come una proiezione SQLite e possono tollerare un certo grado di obsolescenza dei dati (non è uno specchio in tempo reale).

![Grafo delle Citazioni di Synthesis](/img/docs/synthesis/citation-graph.png)

### Tipi di nodo

| Nodo | Colore | Descrizione |
|------|--------|-------------|
| `library_paper` | Blu | Articoli già presenti nella libreria Zotero |
| `external_reference` | Verde | Riferimenti noti non presenti nella libreria |
| `unresolved_reference` | Grigio | Riferimenti estratti ma non identificati |

### Informazioni sugli archi

Ogni arco di citazione contiene:

- **mention_count**: Numero di volte in cui viene citato
- **primary_role**: Ruolo di citazione principale (ad es., sfondo, confronto, supporto, contrasto)
- **aux_roles**: Elenco dei ruoli ausiliari
- **role_evidence**: Base per la determinazione del ruolo

### Metriche del grafo

Il grafo delle citazioni può calcolare varie metriche per aiutare a identificare gli articoli fondamentali e le opere influenti:

| Metrica | Descrizione |
|---------|-------------|
| **Conteggio citazioni** | Numero totale di volte in cui un articolo viene citato |
| **PageRank** | Punteggio di importanza del nodo basato sulla struttura del grafo |
| **Foundation Score** | Grado in cui funge da lavoro fondamentale nel campo |
| **Frontier Score** | Grado in cui rappresenta un lavoro di frontiera |

### Layout di visualizzazione

| Layout | Descrizione | Caso d'uso |
|--------|-------------|------------|
| **Force (Force-Directed)** | Layout d3-force | Esplorare la struttura complessiva |
| **Radial** | Espansione attorno a un nodo selezionato | Analizzare la rete di citazioni di un articolo |
| **Components** | Raggruppamento per componenti connesse | Scoprire cluster di citazioni indipendenti |

### Operazioni interattive

- **Zoom / Pan**: Navigare liberamente nel grafo
- **Hover**: Visualizzare le etichette dei nodi e le informazioni di base
- **Click su nodo**: Aprire l'elemento articolo corrispondente in Zotero
- **Filtro**: Filtrare le citazioni visualizzate per ruolo, argomento o tipo di nodo
- **Attiva/disattiva citazioni a basso segnale**: Mostrare/nascondere gli archi con basso conteggio di citazioni
- **Cursore di profondità**: Controllare la profondità di espansione della rete di citazioni

### Filtro per argomento

È possibile filtrare il grafo delle citazioni per argomento per mostrare solo gli articoli e le relazioni di citazione relative ad argomenti specifici. Gli ambiti degli argomenti vengono visualizzati nel grafo con colori e raggruppamenti diversi.

## Prossimi passi

- [Hub di Revisione](review) — Revisionare le proposte di corrispondenza e deduplicazione delle citazioni
- [Creare una Sintesi di Argomento](topic-synthesis) — Creare analisi per argomento basate sulle reti di citazioni
- [Dashboard Home](home) — Visualizzare le metriche di informazione sulla libreria
- [WebDAV Sync](webdav-sync) — Sincronizzare i dati di associazione delle citazioni tra dispositivi
