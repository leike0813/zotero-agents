# Base di Conoscenza dei Concetti

La Base di Conoscenza dei Concetti (Concept KB) è un livello di conoscenza opzionale nel sistema Synthesis che fornisce una gestione strutturata dei concetti fondamentali citati nella letteratura. I concetti possono essere sovrapposti al grafo degli argomenti e al lettore, arricchendo il contesto per la sintesi degli argomenti.

## Cos'è un concetto?

Nel sistema Synthesis, un **concetto** è un termine o un'entità con significato autonomo all'interno di un dominio di ricerca. A differenza della classificazione piatta dei tag, i concetti possono avere una struttura multi-livello, che include sensi, alias e relazioni.

### Struttura a quattro livelli dei concetti

```
Concetto                — es., "Transformer"
  └── Senso             — es., "Transformer (architettura di machine learning)"
       ├── Alias        — es., "Modello Transformer", "Rete Transformer"
       └── Relazione    — broader_than "Meccanismo di Attenzione"
```

### Tipi di concetto

| Tipo | Descrizione | Esempi |
|------|-------------|--------|
| `method` | Metodi di ricerca | Deep learning, reinforcement learning |
| `model` | Modelli o architetture | Transformer, ResNet |
| `dataset` | Dataset | ImageNet, COCO |
| `metric` | Metriche di valutazione | BLEU, F1-score |
| `field` | Campi di ricerca | Computer vision, elaborazione del linguaggio naturale |
| `task` | Compiti | Classificazione delle immagini, traduzione automatica |
| `tool` | Strumenti | PyTorch, TensorFlow |

## Funzionalità della superficie Concetti

### Elenco dei concetti

Nella pagina Synthesis Workbench → Concetti, è possibile sfogliare tutti i concetti indicizzati:

- **Filtro**: Per tipo (method / model / dataset, ecc.), stato o argomenti associati
- **Ricerca**: Cercare concetti per nome
- **Cambio vista**: Densità compatta / confortevole

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/concepts.webp" alt="Pagina Concetti di Synthesis" title="Pagina Concetti di Synthesis" loading="lazy" /><figcaption>Pagina Concetti di Synthesis</figcaption></figure>

### Dettagli del concetto

Dopo aver selezionato un concetto, è possibile visualizzare e modificare:

| Informazione | Descrizione |
|--------------|-------------|
| **Identità** | ID concetto, nome, tipo |
| **Stato** | active / deprecated / pending |
| **Definizione** | Definizione descrittiva del concetto |
| **Sensi** | Significati specifici del concetto in diversi contesti |
| **Alias** | Nomi alternativi per lo stesso concetto |
| **Relazioni** | Associazioni con altri concetti (più ampio / più stretto / correlato) |
| **Argomenti correlati** | Argomenti che fanno riferimento a questo concetto |

### Gestione dei sensi

Lo stesso concetto può avere significati diversi tra discipline. Il meccanismo dei sensi consente di:

- Aggiungere più sensi a un concetto, ciascuno con la propria definizione
- Annotare il contesto d'uso o il dominio per ciascun senso
- Associare sensi specifici ad articoli o argomenti

### Gestione degli alias

- Registrare diverse convenzioni di denominazione per lo stesso concetto (ad es., nome completo, abbreviazione, termini alternativi)
- Gli alias vengono utilizzati per la corrispondenza delle citazioni e l'identificazione dei concetti

### Funzionalità di sovrapposizione

Le informazioni sui concetti possono essere sovrapposte ad altre superfici:

- **Sovrapposizione al Grafo degli Argomenti**: Visualizzare i concetti correlati a un argomento nel Grafo degli Argomenti
- **Sovrapposizione al Lettore**: Visualizzare le card dei concetti nella pagina di dettaglio dell'argomento

## Revisione

Le proposte di modifica alla base di conoscenza dei concetti (nuovi concetti, nuovi sensi, nuove relazioni) appaiono nella scheda di revisione Concetti dell'[Hub di Revisione](#doc/synthesis%2Freview). È possibile esaminare e decidere se accettare queste proposte.

## Relazione con i tag

Concetti e tag sono due approcci complementari all'organizzazione della conoscenza:

| Dimensione | Tag | Concetti |
|------------|-----|----------|
| Struttura | Piatta, facet:valore | Multi-livello (sensi + alias + relazioni) |
| Scopo | Classificazione e filtro della letteratura | Gestione della conoscenza e analisi delle associazioni |
| Origine | Vocabolario controllato + inferenza AI | Estratti automaticamente dalla letteratura + gestiti dall'utente |
| Ambito | Copre tutta la letteratura | Copertura approfondita dei termini fondamentali selezionati |

## Prossimi passi

- [Hub di Revisione](#doc/synthesis%2Freview) — Revisionare i suggerimenti sui concetti
- [Gestione Tag](#doc/synthesis%2Ftags) — Gestire il vocabolario controllato dei tag
- [Sintesi degli Argomenti](#doc/synthesis%2Ftopic-synthesis) — Sfruttare la conoscenza dei concetti nella creazione di sintesi di argomenti
