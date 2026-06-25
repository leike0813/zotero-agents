# Dashboard Home

La Home è la prima pagina che si apre quando si accede a Synthesis Workbench. Fornisce una panoramica completa della libreria, dello stato della sincronizzazione e un accesso rapido agli argomenti di tendenza.

![Dashboard Home di Synthesis](/img/docs/synthesis/home.png)

## Card di informazioni sulla libreria

Nella parte superiore della pagina viene mostrato un insieme di card con statistiche che illustrano lo stato corrente del sistema Synthesis:

| Metrica | Descrizione |
|---------|-------------|
| **Articoli registrati** | Numero totale di articoli inclusi nell'Indice dei Riferimenti Canonici |
| **Numero argomenti** | Numero di sintesi di argomenti create |
| **Nodi del grafo** | Numero totale di nodi nel grafo delle citazioni (articoli della libreria + riferimenti esterni) |
| **Archi del grafo** | Numero totale di relazioni di citazione nel grafo delle citazioni |
| **Stato sincronizzazione** | Stato di esecuzione della sincronizzazione WebDAV/Git |

Queste metriche consentono di comprendere rapidamente il livello di strutturazione e il progresso della sintesi della vostra libreria.

## Pannello di sincronizzazione

Se la sincronizzazione [WebDAV Sync](webdav-sync) (consigliata) o [Git Sync](git-sync) (deprecata) è configurata, la pagina Home mostra un pannello di stato della sincronizzazione:

### WebDAV Sync

- **Stato sincronizzazione**: idle / queued / syncing / blocked_conflict / failed
- **Ora ultima sincronizzazione**
- **Identificatore HEAD remoto**
- **Pulsanti azione**: Sincronizzazione manuale, pausa/ripresa, riprova

Quando si verificano conflitti, il pannello mostra i dettagli del conflitto e le opzioni di azione (`keep_local`, `clear_after_manual_edit`).

Per la configurazione dettagliata e l'utilizzo della sincronizzazione WebDAV, vedere [WebDAV Sync](webdav-sync).

:::warning Avviso sulla sincronizzazione automatica
La funzionalità di sincronizzazione automatica di WebDAV Sync non è stata testata approfonditamente. Si raccomanda di **utilizzare solo la sincronizzazione manuale** in questa fase, e di abilitare la sincronizzazione automatica dopo che sarà migliorata in una release futura.
:::

### Git Sync (Deprecato)

Vedere [Git Sync](git-sync) per riferimento storico.

## Pannello elementi da revisionare

La pagina Home può mostrare un'anteprima rapida degli elementi in attesa di revisione:

| Categoria di revisione | Descrizione |
|------------------------|-------------|
| **Corrispondenze citazioni** | Proposte di associazione citazione-elemento in sospeso |
| **Concetti** | Suggerimenti di concetti, sensi e alias in sospeso |
| **Relazioni grafo argomenti** | Relazioni inter-argomento in sospeso |
| **Suggerimenti tag** | Tag suggeriti dall'AI in attesa di approvazione |

Ogni categoria mostra un badge con il numero di elementi in sospeso. Fare clic per navigare alla sotto-scheda corrispondente nell'[Hub di Revisione](review).

## Argomenti di tendenza

La sezione inferiore della pagina mostra un elenco di card degli argomenti di tendenza, ordinati per numero di articoli associati. Ogni card contiene:

- **Nome dell'argomento** — Fare clic per accedere alla pagina di dettaglio dell'argomento
- **Numero di articoli** — Numero di articoli coperti dall'argomento
- **Anteprima riassunto** — Estratto della descrizione dell'argomento
- **Pulsanti azione** — Apri argomento, aggiorna argomento

Quando ci sono più argomenti attivi, utilizzare il link "Visualizza tutti" per sfogliare l'elenco completo nella pagina degli Argomenti.

## Prossimi passi

- [WebDAV Sync](webdav-sync) — Configurare la sincronizzazione multi-dispositivo per i dati di Synthesis
- [Hub di Revisione](review) — Gestire gli elementi di revisione per corrispondenze di citazioni, concetti e grafo degli argomenti
- [Indice e Grafo delle Citazioni](index-and-citation) — Gestire l'Indice dei Riferimenti Canonici
