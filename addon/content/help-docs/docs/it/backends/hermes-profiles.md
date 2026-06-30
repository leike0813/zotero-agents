# Profilo Hermes Zotero Librarian

## Panoramica

**zotero-librarian** è un profilo [Hermes](https://github.com/anomalyco/hermes) pronto per l'installazione che consente agli agenti AI di gestire la tua libreria Zotero tramite [Host Bridge](#doc/backends%2Fhost-bridge). Include tutto ciò di cui un agente ha bisogno: la CLI `zotero-bridge`, un modello di profilo di connessione Host Bridge, un indice locale di metadati SQLite, una cache del catalogo dei workflow, script di monitoraggio delle esecuzioni e lavori cron di manutenzione programmata.

Il profilo è distribuito come pacchetto autonomo dal ramo `host-bridge/zotero-librarian-profile` del repository Zotero Agents.

## Cosa può fare

| Funzionalità | Descrizione |
|-------------|-------------|
| **Indice locale di metadati** | Mantiene un'istantanea SQLite interrogabile della tua libreria Zotero — titoli, creatori, tag, collezioni, DOI, conteggi note/allegati — per query rapide e utilizzabili offline |
| **Cache del catalogo workflow** | Memorizza localmente tutti i contratti di payload dei workflow integrati, consentendo agli agenti di inviare workflow noti senza dover interrogare nuovamente gli schemi a ogni esecuzione |
| **Manutenzione programmata** | Sei modelli cron integrati: aggiornamento indice, aggiornamento catalogo workflow, monitoraggio esecuzioni, triage posta in arrivo, igiene della libreria e riepiloghi della coda di attenzione |
| **Monitoraggio esecuzioni** | Tiene traccia delle esecuzioni dei workflow inviate e segnala cambi di stato, stati terminali o elementi che richiedono attenzione |
| **Coda di attenzione** | Combina `insights.get_attention_queue` di Host Bridge con i metadati dell'indice locale per evidenziare attività di lettura e analisi ad alta priorità |

## Installazione

### Prerequisiti

- [Zotero](https://www.zotero.org/) 7+ con il plugin **Zotero Agents** installato
- Host Bridge in esecuzione (verifica: Zotero → Impostazioni → Zotero Agents → Host Bridge → **Avvia / Mostra endpoint**)
- [Hermes](https://github.com/anomalyco/hermes) installato sul tuo sistema
- CLI `zotero-bridge` disponibile (installa tramite il pulsante **Installa CLI** nel pannello delle impostazioni di Host Bridge)

### Installa il profilo

```bash
hermes profile install zotero-librarian
```

Questo scarica il pacchetto del profilo e lo estrae nella tua directory dei profili Hermes.

### Configura Hermes

Modifica il file `config.yaml` del profilo per impostare il tuo provider di modelli preferito:

```yaml
# All'interno della directory del profilo installato
provider:
  type: anthropic    # o openai, local, ecc.
  model: claude-sonnet-4-20250514
  # ... Chiave API e altre impostazioni del provider
```

Consulta la [documentazione di Hermes](https://github.com/anomalyco/hermes) per tutte le opzioni di configurazione del provider.

### Configura la connessione Zotero Bridge

Il profilo include un modello di connessione Host Bridge in `assets/host-bridge/profile.example.json`. Devi fornire l'endpoint e il token effettivi:

1. Apri Zotero → Impostazioni → Zotero Agents → Host Bridge
2. Clicca su **Avvia / Mostra endpoint** per assicurarti che il bridge sia in esecuzione e annota l'URL dell'endpoint (es. `http://127.0.0.1:26570/bridge/v1`)
3. Clicca su **Copia token master** (o utilizza il token di sessione mostrato nel pannello)
4. Imposta il token come variabile d'ambiente:

```bash
# Linux / macOS
export ZOTERO_BRIDGE_TOKEN="<tuo-token>"

# Windows PowerShell
$env:ZOTERO_BRIDGE_TOKEN = "<tuo-token>"
```

5. Per l'accesso remoto/LAN, includi anche l'endpoint direttamente:

```bash
export ZOTERO_BRIDGE_ENDPOINT="http://127.0.0.1:26570/bridge/v1"
```

Il modello del profilo utilizza `auth.tokenEnv: "ZOTERO_BRIDGE_TOKEN"`, quindi la CLI preleva automaticamente il token dall'ambiente. Consulta [Configurazione Host Bridge](#doc/backends%2Fhost-bridge) per la documentazione dettagliata su endpoint, token e file di profilo.

### Verifica la configurazione

```bash
# Verifica la connettività con Host Bridge
zotero-bridge status

# Installa i binari CLI nel profilo (solo la prima volta)
python scripts/install_zotero_bridge_cli.py

# Primo aggiornamento dell'indice (recupera tutti i metadati della libreria in SQLite locale)
python scripts/zotero_librarian_index_service.py refresh

# Test di una ricerca nell'indice locale
python scripts/zotero_librarian_index_service.py search "machine learning"
```

## Comandi del servizio di indicizzazione

L'utilità principale del profilo è `zotero_librarian_index_service.py`. Mantiene un database SQLite locale per query rapide e ripetute della libreria senza chiamare Zotero a ogni richiesta.

| Comando | Descrizione |
|---------|-------------|
| `refresh` | Scorre `zotero-bridge library snapshot` e aggiorna atomicamente l'indice SQLite. Gli elementi assenti dall'ultimo aggiornamento vengono contrassegnati come eliminati. |
| `search "<query>"` | Ricerca full-text su titoli, creatori, identificatori, tag, collezioni e campi di pubblicazione |
| `item <key-or-id>` | Restituisce un singolo record indicizzato per chiave elemento Zotero o ID numerico |
| `stats` | Riporta conteggi di elementi attivi/eliminati, tag, collezioni e stato del catalogo workflow |
| `workflow-refresh` | Chiama `workflow list` e `workflow describe` per aggiornare la cache del catalogo workflow locale |
| `workflow-show <id>` | Mostra il contratto di payload memorizzato nella cache per un workflow noto |
| `run-register --run-id <id> --workflow-id <id>` | Registra un'esecuzione di workflow inviata per il monitoraggio |
| `run-watch` | Controlla tutte le esecuzioni registrate attive e segnala cambi di stato o stati terminali |

## Casi d'uso

### Gestione della libreria

**Triage giornaliero della posta in arrivo** (`cron/inbox-triage.yaml`)

Il cron di triage della posta in arrivo del profilo viene eseguito quotidianamente e verifica la completezza dei nuovi elementi nella tua libreria:

- Elementi con stato `0-inbox` (non elaborati)
- Tag o assegnazioni di collezione mancanti
- DOI, URL o file allegati mancanti
- Artefatti di riepilogo o digest mancanti

Produce un rapporto di azioni suggerite ma non effettua alcuna modifica a Zotero senza la tua approvazione.

**Igiene settimanale della libreria** (`cron/library-hygiene.yaml`)

Viene eseguito settimanalmente il lunedì e analizza la libreria alla ricerca di problemi di qualità dei dati:

- Voci duplicate (per DOI, titolo o ISBN)
- Titoli sospetti con caratteri corrotti
- Elementi orfani (nessuna collezione principale)
- Collezioni vuote
- Conteggi eccessivi di tag su singoli elementi
- Elementi con tipi di elemento Zotero insoliti

Tutti i suggerimenti sono in sola lettura fino a quando non approvi esplicitamente le azioni correttive.

**Coda di attenzione** (`cron/attention-queue.yaml`)

Combina `insights.get_attention_queue` di Host Bridge con i metadati dell'indice locale per visualizzare un elenco classificato di attività ad alta priorità — articoli da leggere, lacune nei metadati da colmare, workflow da eseguire.

### Ricerca e importazione di letteratura

1. Cerca prima nel tuo indice locale per evitare di aggiungere nuovamente articoli che già possiedi:
   ```bash
   python scripts/zotero_librarian_index_service.py search "attention mechanism survey"
   ```

2. Se un articolo non viene trovato, utilizza il workflow `literature-search-ingest` per cercare fonti esterne e aggiungerlo a Zotero:
   ```bash
   zotero-bridge workflow submit \
     --workflow literature-search-ingest \
     --none \
     --workflow-options '{"query":"attention mechanism survey","searchMode":"arxiv-and-doi"}'
   ```

3. Dopo l'importazione, esegui i workflow tag-bootstrapper o tag-regulator per normalizzare i tag sui nuovi elementi.

### Workflow automatizzati di analisi della letteratura

Il profilo cataloga tutti i workflow integrati del plugin Zotero Agents. Una volta aggiornato il catalogo, puoi inviare qualsiasi workflow direttamente senza dover consultare nuovamente il suo schema.

**Analisi della letteratura in batch**

Invia il workflow `literature-analysis` su una collezione di articoli per generare digest strutturati:

```bash
zotero-bridge workflow submit \
  --workflow literature-analysis \
  --items @items.json \
  --workflow-options '{"language":"it"}'
```

Registra e monitora l'esecuzione:

```bash
python scripts/zotero_librarian_index_service.py run-register --run-id <run-id> --workflow-id literature-analysis
python scripts/zotero_librarian_index_service.py run-watch
```

**Lettura approfondita di un singolo articolo**

Per un'analisi approfondita di un articolo specifico:

```bash
zotero-bridge workflow submit \
  --workflow literature-deep-reading \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"target_language":"it","mode":"comprehensive"}'
```

**Sintesi tematica tra articoli**

Sintetizza temi attraverso una collezione di articoli:

```bash
zotero-bridge workflow submit \
  --workflow create-topic-synthesis \
  --items @collection-items.json \
  --workflow-options '{"topicSeed":"self-supervised learning","language":"it"}'
```

**Assistenza alla traduzione**

Traduci metadati o riassunti di articoli:

```bash
zotero-bridge workflow submit \
  --workflow literature-translator \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"target_language":"it","mode":"metadata"}'
```

**Domande e risposte sugli articoli**

Fai domande sul contenuto di un articolo:

```bash
zotero-bridge workflow submit \
  --workflow literature-explainer \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"language":"it"}'
```

## Lavori di manutenzione programmati

Il profilo include sei modelli cron preconfigurati nella directory `cron/`:

| Lavoro Cron | Pianificazione | Comportamento |
|------------|---------------|---------------|
| `index-refresh` | Ogni 6 ore | Scorre `library snapshot` per mantenere aggiornato l'indice SQLite locale. Riporta `[SILENT]` quando non vengono rilevate modifiche. |
| `workflow-catalog-refresh` | Ogni giorno alle 03:00 | Chiama `workflow list` + `workflow describe` per aggiornare la cache del catalogo workflow. Riporta `[SILENT]` in assenza di modifiche. |
| `run-monitor` | Ogni 5 minuti | Chiama `run-watch` per controllare le esecuzioni registrate attive. Riporta solo cambi di stato, stati terminali o elementi che richiedono attenzione. |
| `inbox-triage` | Ogni giorno alle 09:00 | Cerca elementi con `status:0-inbox`, tag mancanti, collezioni mancanti, metadati mancanti. Genera un rapporto in sola lettura. |
| `library-hygiene` | Settimanalmente il lunedì | Analizza voci duplicate, elementi orfani, collezioni vuote e problemi di qualità dei dati. |
| `attention-queue` | Ogni giorno alle 18:00 | Combina le informazioni della coda di attenzione con i dati dell'indice locale per classificare le attività ad alta priorità. |

Tutti i lavori di manutenzione non interattivi utilizzano marcatori `[SILENT]` per evitare di disturbare l'utente quando non vengono trovati risultati attuabili.

## Limiti di sicurezza

- Il modello di profilo (`profile.example.json`) non contiene mai token reali. Utilizza sempre `ZOTERO_BRIDGE_TOKEN` come variabile d'ambiente.
- I lavori cron di manutenzione sono in sola lettura per impostazione predefinita. Le modifiche richiedono l'approvazione esplicita dell'utente.
- Non leggere mai direttamente i file del database Zotero. Utilizza sempre Host Bridge, `zotero-bridge` e l'indice locale prodotto da `library.sync_snapshot`.

## Prossimi passi

- [Host Bridge](#doc/backends%2Fhost-bridge) — riferimento completo per la CLI `zotero-bridge` e le funzionalità di Host Bridge
- [Workflow](#doc/workflows%2Findex) — panoramica di tutti i workflow integrati e personalizzati
- [Server MCP](#doc/backends%2Fmcp-server) — interfaccia di protocollo alternativa per client compatibili con MCP
