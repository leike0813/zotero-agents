# Host Bridge

## Panoramica

Host Bridge è il server HTTP integrato del plugin che consente agli strumenti AI esterni (Codex, Claude Code, OpenCode, ecc.) di accedere direttamente alla tua libreria Zotero. È il ponte di comunicazione tra gli Agent ACP e Zotero e funge da trasporto sottostante sia per la CLI `zotero-bridge` che per il Server MCP.

## Architettura

```
Processo del plugin Zotero
│
├── Server HTTP Host Bridge (loopback: 127.0.0.1:<porta>)
│     ├── Autenticazione con Bearer Token (ogni richiesta)
│     ├── Cancello di approvazione per le scritture (per operazione)
│     └── Router delle funzionalità (60+ funzionalità)
│
└── CLI zotero-bridge (binario companion)
      ├── Comandi semantici (contesto, libreria, mutazione, sintesi)
      ├── File di configurazione (bridge-profile.json)
      └── Modalità stdin/pipe (per l'integrazione con agent ACP)
```

Versione del protocollo: `host-bridge.v2`. Tutti gli endpoint tranne `GET /bridge/v1/health` richiedono l'autenticazione con Bearer Token. I contratti delle funzionalità utilizzano `host-bridge.capabilities.v2`.

## Configurazione

Zotero → Impostazioni → Zotero Agents → Host Bridge

| Impostazione | Tipo | Predefinito | Descrizione |
|-------------|------|-------------|-------------|
| **Abilita Server MCP** | boolean | `true` | Abilita anche il protocollo MCP per agent di terze parti |
| **Disabilita approvazione scritture** | boolean | `false` | Pericoloso: bypassa tutta l'approvazione delle scritture. Contrassegnato come zona rossa di pericolo |
| **Abilita accesso LAN** | boolean | `false` | Associa a `0.0.0.0` per l'accesso LAN (forza la porta fissa) |
| **Porta fissa** | boolean | `false` | Fissa la porta (predefinita 26570) invece di usare una porta casuale |
| **Numero di porta** | number | `26570` | Porta utilizzata in modalità fissa (1024-65535) |
| **IP LAN** | string | `""` | Sovrascrittura manuale dell'IP LAN pubblicizzato; lasciare vuoto per il rilevamento automatico |
| **Avvia / Mostra endpoint** | button | — | Assicura che il server sia in esecuzione e mostra l'URL dell'endpoint corrente |
| **Ruota token** | button | — | Ruota il token di sessione |
| **Crea / Ruota Master Token** | button | — | Genera un token persistente cross-sessione |
| **Copia Master Token** | button | — | Copia il token negli appunti |
| **Copia profilo CLI remoto** | button | — | Copia il JSON completo del profilo CLI remoto |
| **Installa CLI** | button | — | Installa con un clic `zotero-bridge` nel PATH di sistema |

## Modello di sicurezza

### Autenticazione con Bearer Token

- Ogni richiesta deve includere l'header `Authorization: Bearer <token>`
- **Token di sessione**: generato automaticamente all'avvio del plugin (24 byte in base64), vive per la durata della sessione del plugin
- **Master Token**: token persistente opzionale, archiviazione crittografata con AES-256-GCM, per l'accesso CLI cross-sessione
- I token non vengono mai scritti nei prompt, nei log o nell'output dell'agent

### Approvazione delle scritture

Le operazioni di scrittura richiedono l'approvazione dell'interfaccia di Zotero:

| Livello | Descrizione |
|---------|-------------|
| **Approvazione richiesta** | `mutation.execute`, `workflow submit`, `debug.zotero.eval`, `citation_graph.refresh_metrics` |
| **Auto-approvate** | Tutte le operazioni di sola lettura, `diagnostic.get_status`, `mutation.preview` |

**Doppio cancello per l'auto-approvazione:**
1. Il manifesto del Workflow dichiara `allowWriteApprovalBypass: true`
2. L'utente seleziona esplicitamente l'auto-approvazione nella finestra di invio

Entrambi devono essere soddisfatti affinché l'auto-approvazione abbia effetto.

### Sicurezza LAN / Remoto

- La modalità LAN associa `0.0.0.0` e deve essere abilitata manualmente. **Da usare solo su reti affidabili**
- L'accesso remoto richiede un Master Token (creato manualmente), mai distribuito automaticamente
- Il rilevamento automatico dell'IP LAN utilizza la riflessione di rete del backend SkillRunner; può essere sovrascritto manualmente

## La CLI `zotero-bridge`

`zotero-bridge` è uno strumento CLI in Rust per gli agent ACP e gli utenti da terminale per chiamare Host Bridge.

### Installazione

Usa il pulsante "Installa CLI" nelle preferenze. Le esecuzioni ACP usano il binario integrato nel plugin (iniettato nel PATH dello spazio di lavoro).

### Priorità di risoluzione di Endpoint / Token

| Origine | Endpoint | Token |
|---------|----------|-------|
| Flag CLI | `--endpoint` | — |
| Ambiente | `ZOTERO_BRIDGE_ENDPOINT` | `ZOTERO_BRIDGE_TOKEN` |
| File di profilo | Campo `endpoint` | `auth.token` / `auth.tokenEnv` |

### Comandi semantici

<details>
<summary>Tutti i 125 comandi canonici</summary>

#### surface — Agent Surface
```
zotero-bridge surface identity --json
zotero-bridge surface describe <command...> --json
zotero-bridge surface search --intent <text>
```

#### bridge — Server Status & Profile
```
zotero-bridge bridge status
zotero-bridge bridge manifest
zotero-bridge bridge profile inspect
zotero-bridge bridge profile diagnose
zotero-bridge bridge backend list
zotero-bridge bridge backend status
zotero-bridge call <capability> [--input <json>]
```

#### library — Reading the Library
```
zotero-bridge library items list [--cursor <c>]
zotero-bridge library item search --query <text>
zotero-bridge library item get --key <key>
zotero-bridge library item notes --key <key>
zotero-bridge library item attachments --key <key>
zotero-bridge library note get --key <key>
zotero-bridge library note payloads --key <key>
zotero-bridge library note payload --key <key> --payload-id <id>
zotero-bridge library annotation list --key <key>
zotero-bridge library annotation export --key <key> --format json|markdown
zotero-bridge library snapshot --input <json>
zotero-bridge library readiness audit --input <json>
zotero-bridge library readiness missing-pdf --input <json>
zotero-bridge library readiness missing-markdown --input <json>
zotero-bridge library readiness missing-analysis --input <json>
```

#### context — UI Context & Navigation
```
zotero-bridge context current
zotero-bridge context selection get
zotero-bridge context selection open
zotero-bridge context item open --key <key>
zotero-bridge context note open --key <key>
zotero-bridge context collection open --key <key>
```

#### synthesis — Synthesis Layer
```
zotero-bridge synthesis topic list --input <json>
zotero-bridge synthesis topic find-by-paper-ref --input <json>
zotero-bridge synthesis topic get-context --input <json>
zotero-bridge synthesis topic get-report --input <json>
zotero-bridge synthesis topic get-review-input --input <json>
zotero-bridge synthesis schema get
zotero-bridge synthesis concept query --input <json>
zotero-bridge synthesis graph overview --input <json>
zotero-bridge synthesis graph query-cluster --input <json>
zotero-bridge synthesis graph get-slice --input <json>
zotero-bridge synthesis graph get-layout --input <json>
zotero-bridge synthesis graph get-metrics --input <json>
zotero-bridge synthesis graph rank-external-references --input <json>
zotero-bridge synthesis graph rank-library-papers --input <json>
zotero-bridge synthesis graph refresh-metrics --input <json>
zotero-bridge synthesis graph update --input <json>
zotero-bridge synthesis index status
zotero-bridge synthesis index library get --input <json>
zotero-bridge synthesis index reference get --input <json>
zotero-bridge synthesis cache status
zotero-bridge synthesis cache refresh-reference-sidecar --input <json>
zotero-bridge synthesis cache invalidate --input <json>
zotero-bridge synthesis resolver resolve --input <json>
zotero-bridge synthesis artifact manifest --input <json>
zotero-bridge synthesis artifact read --input <json>
zotero-bridge synthesis artifact export-filtered --input <json>
zotero-bridge synthesis artifact resolve-topic-digest --input <json>
zotero-bridge synthesis insight attention-queue
```

#### mutation — Write Operations
```
zotero-bridge mutation preview --input <json>
zotero-bridge mutation apply --input <json>
zotero-bridge mutation literature-ingest --input <json>
zotero-bridge mutation tag add --input <json>
zotero-bridge mutation tag remove --input <json>
zotero-bridge mutation collection create --input <json>
zotero-bridge mutation collection add-items --input <json>
zotero-bridge mutation collection remove-items --input <json>
zotero-bridge mutation item update --input <json>
zotero-bridge mutation item attach-file --input <json>
zotero-bridge mutation note create --input <json>
zotero-bridge mutation note update --input <json>
zotero-bridge mutation note upsert-payload --input <json>
```

#### workflow — Workflow Management
```
zotero-bridge workflow list
zotero-bridge workflow submit --workflow <id> (--input <json> | --none)
zotero-bridge workflow queue list [--workflow <id>]
zotero-bridge workflow queue cancel --submission-id <id>
zotero-bridge workflow submission get --submission-id <id>
zotero-bridge workflow describe --workflow <id> [--json]
zotero-bridge workflow validate --input <json>
zotero-bridge workflow requirements --workflow <id> --input <json>
zotero-bridge workflow profile list
zotero-bridge workflow profile describe --profile <id>
zotero-bridge workflow profile validate --profile <id>
zotero-bridge workflow agent-run --workflow <id> (--input <json> | --none) --output-dir <dir>
zotero-bridge workflow agent-bundle inspect --path <path>
zotero-bridge workflow agent-result validate --input <json>
zotero-bridge workflow agent-apply --run-id <id> --input <json>
zotero-bridge workflow agent-apply-status --run-id <id>
zotero-bridge workflow agent-renew --run-id <id>
zotero-bridge workflow agent-abandon --run-id <id>
```

#### run — Runtime Observation
```
zotero-bridge run get --run-id <id>
zotero-bridge run cancel --run-id <id>
zotero-bridge run list [--workflow <id>]
zotero-bridge run active
zotero-bridge run recent
zotero-bridge run workflow recent
zotero-bridge run skill get --run-id <id>
zotero-bridge run skill reply --run-id <id> --input <json>
zotero-bridge run skill connect --run-id <id>
zotero-bridge run skill recent
zotero-bridge run skill events --run-id <id>
zotero-bridge run notification list [--limit <n>]
zotero-bridge run notification wait [--timeout-ms <ms>]
zotero-bridge run notification ack --notification-id <id>
zotero-bridge run permission pending
zotero-bridge run permission get --request-id <id>
```

#### file — File Transfers
```
zotero-bridge file download <fileId> --output <path>
zotero-bridge file upload --path <path>
```

#### product — Dashboard Products
```
zotero-bridge product list [--limit <n>]
zotero-bridge product get --product-id <id>
zotero-bridge product download --product-id <id> --output <path>
zotero-bridge product remove --product-id <id>
```

#### operation — Persistent Operations
```
zotero-bridge operation get --operation-id <id>
```

</details>

L'input accetta: JSON inline, percorso di file JSON, sintassi `@file`, `-` (stdin).

Per il catalogo dei comandi completo e aggiornato, esegui `zotero-bridge surface identity --json` per visualizzare il `commandCatalogChecksum` corrente, quindi `zotero-bridge surface describe <command...>` per il contratto di un comando specifico.

### Contratto di output

stdout emette sempre esattamente un oggetto JSON:

```json
{ "ok": true, "data": {...}, "meta": { "cliSchema": "zotero-bridge.cli.v5" } }
{ "ok": false, "error": {...}, "meta": { "cliSchema": "zotero-bridge.cli.v5" } }
```

Codici di uscita per errore:

| Categoria | Codice di uscita |
|-----------|-----------------:|
| usage | 2 |
| config | 3 |
| connection | 4 |
| auth | 5 |
| permission | 6 |
| validation | 7 |
| capability | 8 |
| workflow | 9 |
| download | 10 |
| protocol | 11 |
| internal | 70 |

### File di profilo

Posizioni note dei profili:

| SO | Percorso |
|----|----------|
| Windows | `%LOCALAPPDATA%\zotero-agents\bridge-profile.json` |
| macOS | `~/Library/Application Support/zotero-agents/bridge-profile.json` |
| Linux | `${XDG_DATA_HOME:-~/.local/share}/zotero-agents/bridge-profile.json` |

```json
{
  "schema": "zotero-bridge.profile.v1",
  "protocol": "host-bridge.v2",
  "endpoint": "http://127.0.0.1:26570/bridge/v1",
  "connectionMode": "local",
  "auth": { "type": "bearer", "tokenEnv": "ZOTERO_BRIDGE_TOKEN" }
}
```

## Integrazione con Agent ACP

Quando un agent ACP esegue una skill, il plugin inietta automaticamente:

```
<workspaceDir>/.zotero-bridge/
  bin/zotero-bridge(.cmd)     # Shim CLI
  profile.json                # Profilo di connessione (token tramite variabile d'ambiente)
  README.md                   # Suggerimenti per l'uso
```

Variabili d'ambiente iniettate:

- `ZOTERO_BRIDGE_PROFILE` — percorso di profile.json
- `ZOTERO_BRIDGE_TOKEN` — bearer token
- `ZOTERO_BRIDGE_SCOPE` — JSON dell'ambito di approvazione
- `PATH` / `Path` — preceduto da `.zotero-bridge/bin`

## Funzionalità disponibili

<details>
<summary>Tutte le 60+ funzionalità</summary>

### Contesto

| Funzionalità | Descrizione |
|-------------|-------------|
| `context.get_current_view` | Informazioni sulla vista corrente di Zotero |
| `context.get_selected_items` | Elementi attualmente selezionati |

### Libreria

| Funzionalità | Descrizione |
|-------------|-------------|
| `library.search_items` | Cerca elementi |
| `library.get_item_detail` | Ottieni i dettagli dell'elemento |
| `library.list_items` | Elenco paginato degli elementi |
| `library.sync_snapshot` | Snapshot paginato dei metadati per l'indicizzazione locale |
| `library.get_item_notes` | Elenca le note |
| `library.get_note_detail` | Leggi il contenuto della nota |
| `library.list_note_payloads` | Elenca i payload delle note |
| `library.get_note_payload` | Ottieni un payload specifico |
| `library.get_item_attachments` | Elenca gli allegati |
| `library.list_annotations` | Elenca le annotazioni del lettore |
| `library.export_annotations` | Esporta le annotazioni del lettore in formato markdown o JSON |
| `library.readiness_audit` | Audit di prontezza della libreria paginato e di sola lettura |

### Mutazione

| Funzionalità | Descrizione |
|-------------|-------------|
| `mutation.preview` | Anteprima di un'operazione di scrittura (senza eseguire) |
| `mutation.execute` | Esegui un'operazione di scrittura (richiede approvazione) |

### Workflow Products

| Funzionalità | Descrizione |
|-------------|-------------|
| `workflow_products.list` | Elenca i Dashboard Products normali |
| `workflow_products.get` | Restituisce i metadati pubblici di un prodotto |
| `workflow_products.read_asset` | Registra un asset di prodotto per il download |
| `workflow_products.export` | Esporta uno o tutti gli asset di un prodotto |
| `workflow_products.remove` | Rimuove un record di prodotto |

### Sintesi — Argomenti

| Funzionalità | Descrizione |
|-------------|-------------|
| `topics.list` | Elenca tutti gli argomenti |
| `topics.find_by_paper_ref` | Trova argomenti per riferimento a un articolo |
| `topics.get_context` | Ottieni il contesto dell'argomento |
| `topics.get_report` | Ottieni il rapporto sull'argomento |
| `topics.get_review_input` | Assembla il pacchetto di revisione dell'argomento |

### Sintesi — Grafo delle citazioni

| Funzionalità | Descrizione |
|-------------|-------------|
| `citation_graph.query_cluster` | Interroga il cluster di citazioni |
| `citation_graph.get_overview` | Ottieni la panoramica del grafo |
| `citation_graph.get_slice` | Estrai una porzione del sottografo |
| `citation_graph.get_metrics` | Calcola le metriche del grafo |
| `citation_graph.get_layout` | Ottieni le coordinate di layout persistenti |
| `citation_graph.rank_external_references` | Classifica i riferimenti esterni |
| `citation_graph.rank_library_papers` | Classifica gli articoli della libreria |
| `citation_graph.refresh_metrics` | Diagnostica: aggiorna le metriche persistenti |
| `citation_graph.update` | Avvia un aggiornamento atomico del grafo delle citazioni |

### Sintesi — Concetti, Schemi, Risolutori

| Funzionalità | Descrizione |
|-------------|-------------|
| `concepts.query` | Interroga la base di conoscenza dei concetti |
| `schemas.get` | Ottieni le definizioni degli schemi |
| `resolvers.resolve` | Risolvi i risolvitori di riferimenti/argomenti |

### Sintesi — Artifact degli articoli

| Funzionalità | Descrizione |
|-------------|-------------|
| `paper_artifacts.get_manifest` | Ottieni il manifesto degli artifact |
| `paper_artifacts.read` | Leggi il contenuto degli artifact |
| `paper_artifacts.export_filtered` | Esporta gli artifact filtrati |
| `paper_artifacts.resolve_topic_digest` | Risolvi il riassunto dell'argomento |

### Sintesi — Indici e Insight

| Funzionalità | Descrizione |
|-------------|-------------|
| `reference_index.get` | Ottieni l'indice dei riferimenti |
| `reference_sidecar.refresh` | Avvia l'aggiornamento del sidecar dei riferimenti |
| `library_index.get` | Ottieni l'indice della libreria |
| `insights.get_attention_queue` | Ottieni la coda di attenzione |
| `synthesis.operation.get` | Leggi la ricevuta persistente dell'operazione di sintesi |

### Diagnostica

| Funzionalità | Descrizione |
|-------------|-------------|
| `diagnostic.get_status` | Ottieni lo stato del servizio |

### Debug (solo in modalità debug)

| Funzionalità | Descrizione |
|-------------|-------------|
| `debug.status` | Snapshot di stato di debug di Host Bridge |
| `debug.persistence.snapshot` | Snapshot della persistenza runtime |
| `debug.tasks.snapshot` | Diagnostica dei task dei Workflow e delle esecuzioni ACP |
| `debug.zotero.eval` | Esegui JavaScript approvato nel contesto di Zotero |
| `debug.acpSkillRun.reapplyResult` | Riesegui applyResult per un'esecuzione skill ACP |
| `debug.skillrunner.connections.snapshot` | Diagnostica del governatore delle connessioni SkillRunner |
| `debug.synthesis.snapshot` | Snapshot delle operazioni e della cache di Synthesis |
| `debug.synthesis.diff` | Confronta i payload Zotero con le cache del repository |
| `debug.synthesis.cache.list` | Elenca le righe della cache sidecar di Synthesis |
| `debug.synthesis.operations.list` | Elenca le operazioni di Synthesis |
| `debug.synthesis.paper.inspect` | Ispeziona un articolo attraverso le cache |
| `debug.synthesis.topic.inspect` | Ispeziona un argomento attraverso gli artifact |
| `debug.synthesis.profiler.list` | Esecuzioni del profiler di Synthesis |
| `debug.synthesis.cleanInstallReset` | Pericoloso: reimposta lo stato del DB di Synthesis |

</details>

## Flusso di approvazione delle scritture

```
L'agent chiama una funzionalità di scrittura
  │
  ├── 1. La richiesta arriva a Host Bridge (con Bearer Token)
  ├── 2. Il token viene validato
  ├── 3. L'ambito viene estratto
  ├── 4. Verifica dell'approvazione:
  │     ├── Ambito di sola lettura → esegui immediatamente
  │     ├── autoApproveWrites = true E l'utente ha pre-approvato → esegui
  │     └── Approvazione necessaria → in coda all'interfaccia di Zotero
  ├── 5. La richiesta di approvazione viene mostrata nella Chat ACP / nel pannello SkillRunner
  │     ├── L'utente approva → esegui
  │     └── L'utente nega → restituisci errore
  └── 6. Il risultato viene restituito, il log di audit viene scritto
```

Instradamento dell'ambito:

| Ambito | Interfaccia di approvazione |
|--------|----------------------------|
| `acp-skill-run` | Interfaccia Competenze ACP |
| `acp-chat` | Pannello Chat ACP |
| `skillrunner-run` | Pannello SkillRunner |
| Nessun ambito / `global` | Interfaccia di approvazione globale di Zotero |

## Accesso LAN / Remoto

1. Seleziona **Abilita accesso LAN** nelle preferenze
2. Fissa una porta o annota la porta corrente
3. Crea / copia un **Master Token**
4. Fai clic su **Copia profilo CLI remoto** per la configurazione di connessione completa
5. Sul computer remoto, configura l'`endpoint` (`http://<IP_LAN>:<porta>/bridge/v1`) e il token
6. Test: `zotero-bridge status --endpoint http://<IP_LAN>:<porta>/bridge/v1`

**Importante:** La modalità LAN bypassa la protezione loopback. Da usare solo su reti locali affidabili.

## Passi successivi

- [Server MCP](mcp-server) — Interfaccia protocollo standardizzata per client compatibili con MCP (Claude Desktop, ecc.)
- [Hermes Profiles](hermes-profiles) — Profilo installabile per gestire la tua libreria Zotero con agenti AI
- [Preferenze](../preferences) — Visualizza tutte le impostazioni di Host Bridge
- [Backend ACP](acp) — Scopri la configurazione degli Agent ACP
