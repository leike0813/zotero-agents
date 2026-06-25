# Git Sync

:::warning Deprecato

Git Sync è stato deprecato nella versione corrente e non è più disponibile esternamente. Il plugin è passato a **WebDAV Durable Bundle Sync**, che utilizza il protocollo WebDAV per scambiare snapshot dello stato di persistenza di Synthesis (invece dei repository Git) per una sincronizzazione multi-dispositivo più leggera.

**Utilizzare invece [WebDAV Sync](webdav-sync).**

Git Sync è mantenuto solo come canale di trasporto interno implicito (utilizzato per la diagnostica storica e la pulizia futura). La documentazione seguente è conservata per riferimento storico.

:::

Git Sync è una funzionalità opzionale di Synthesis Workbench che sincronizza i dati del grafo della conoscenza dal Canonical Store a un repository Git, abilitando il controllo versione, il backup e la collaborazione.

## Casi d'uso

- **Controllo versione**: Tracciare la cronologia delle modifiche per tutti i vocabolari di tag, le sintesi di argomenti e la base di conoscenza dei concetti
- **Backup**: Eseguire il backup dei dati di conoscenza strutturati in un repository Git remoto
- **Collaborazione**: Più ricercatori condividono lo stesso sistema di tag e i risultati delle analisi

## Configurazione

Configurare Git Sync nelle Preferenze di Zotero:

Zotero → Impostazioni → Zotero Agents → Synthesis Git Sync

| Impostazione | Descrizione |
|--------------|-------------|
| **Abilita Git Sync** | Attivare/disattivare la sincronizzazione |
| **URL repository remoto** | Indirizzo del repository Git remoto (supporta HTTPS e SSH) |
| **Nome branch** | Branch Git utilizzata per la sincronizzazione |

### Prerequisiti

- Git installato (disponibile nel PATH di sistema)
- Un repository Git remoto accessibile (GitHub, Gitee, self-hosted, ecc.)
- Se si utilizza un repository HTTPS, le credenziali Git devono essere configurate

## Ambito della sincronizzazione

Git Sync sincronizza solo gli **asset di dominio canonico** (dati di conoscenza strutturati nel Canonical Store), escludendo i dati runtime.

### Cosa viene sincronizzato

| Dominio | Contenuto |
|---------|-----------|
| `tags/` | Vocabolario controllato dei tag |
| `topics/` | Artifact strutturati per la sintesi degli argomenti |
| `concepts/` | Base di conoscenza dei concetti (concetti, sensi, alias, relazioni) |
| `topic-graph/` | Nodi e archi del grafo degli argomenti |
| `citation-graph/` | Snapshot del grafo delle citazioni |

### Cosa non viene sincronizzato

| Non sincronizzato | Motivo |
|-------------------|--------|
| Database `state/` | Stato runtime SQLite; può essere ricostruito dagli asset canonici |
| Log runtime | Dati diagnostici temporanei |
| File workspace | Dati temporanei generati durante l'esecuzione |
| Stato code e lock | Stato interno di pianificazione |

## Macchina a stati della sincronizzazione

Il sistema di sincronizzazione utilizza una macchina a stati guidata da coda per garantire la consistenza:

```
idle → queued → syncing → idle
                  ↓
            blocked_conflict
                  ↓
            failed_retryable / failed_permanent / disabled
```

| Stato | Descrizione |
|-------|-------------|
| `idle` | Inattivo, nessuna attività in sospeso |
| `queued` | Modifiche in attesa di sincronizzazione |
| `syncing` | Operazione di sincronizzazione in corso |
| `blocked_conflict` | Sincronizzazione fallita; i conflitti richiedono risoluzione manuale |
| `failed_retryable` | Fallimento temporaneo (ad es., problemi di rete); riprovabile |
| `failed_permanent` | Fallimento permanente (ad es., errore di configurazione) |
| `disabled` | Git Sync è disattivato |

## Gestione dei conflitti

I conflitti sorgono quando sia il locale che il remoto hanno modifiche non unite.

### Report dei conflitti

Il report dei conflitti elenca:

- **Percorsi dei file in conflitto**
- **Hash della versione locale**
- **Hash della versione remota**
- **Motivo del conflitto** (ad es., entrambe le parti hanno modificato lo stesso tag contemporaneamente)

### Passi per la risoluzione

1. Visualizzare il report dei conflitti nel pannello Git Sync nella pagina Home
2. Analizzare il contenuto del conflitto (granularità a livello di file)
3. Decidere se mantenere la versione locale, la versione remota o eseguire un'unione manuale
4. Dopo aver completato l'unione, effettuare il commit delle modifiche

## Best practice

### Sincronizzazione regolare

Git Sync non è una sincronizzazione in tempo reale. Si raccomanda di:

- Avviare manualmente la sincronizzazione dopo aver completato un lotto di gestione dei tag o modifiche agli argomenti
- Oppure monitorare lo stato della sincronizzazione nella pagina Home per assicurarsi che la coda non si accumuli

### Collaborazione in team

Quando più persone condividono lo stesso vocabolario di tag:

- Si raccomanda di designare una persona dedicata alla gestione del vocabolario
- Dopo che le modifiche ai tag si propagano tramite Git Sync, gli altri membri eseguono un pull di sincronizzazione
- Risolvere i conflitti tramite consultazione

### Strategia di backup

- Git Sync integra il Canonical Store come backup aggiuntivo; non sostituisce il backup dei dati di Zotero stessi
- Si raccomanda di eseguire regolarmente il push del repository Git verso il remoto (supporto integrato)
- La sincronizzazione iniziale può richiedere molto tempo; le sincronizzazioni successive sono incrementali

## Prossimi passi

- [Dashboard Home](home) — Visualizzare il pannello di stato della sincronizzazione
- [Gestione Tag](tags) — Gestire il vocabolario controllato dei tag
- [Preferenze](../preferences) — Configurare i parametri del repository Git
