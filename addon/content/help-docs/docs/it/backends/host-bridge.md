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
│     └── Router delle funzionalità (30+ funzionalità)
│
└── CLI zotero-bridge (binario companion)
      ├── Comandi semantici (contesto, libreria, mutazione, sintesi)
      ├── File di configurazione (bridge-profile.json)
      └── Modalità stdin/pipe (per l'integrazione con agent ACP)
```

Versione del protocollo: `host-bridge.v1`. Tutti gli endpoint tranne `GET /bridge/v1/health` richiedono l'autenticazione con Bearer Token.

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

```
zotero-bridge status                           # Controllo stato (senza auth)
zotero-bridge manifest                         # Manifesto completo delle funzionalità
zotero-bridge call <funzionalità> [--input]    # Chiamata grezza a funzionalità
zotero-bridge item search --query <testo>
zotero-bridge item get --key <chiave>
zotero-bridge item notes --key <chiave>
zotero-bridge item attachments --key <chiave>
zotero-bridge note get --key <chiave>
zotero-bridge note payloads --key <chiave>
zotero-bridge note payload --key <chiave>
zotero-bridge topics list
zotero-bridge topics get-context --input <JSON>
zotero-bridge topics get-report --input <JSON>
zotero-bridge schemas get
zotero-bridge concepts query --input <JSON>
zotero-bridge citation-graph query-cluster --input <JSON>
zotero-bridge citation-graph get-overview
zotero-bridge library-index get
zotero-bridge resolvers resolve --input <JSON>
zotero-bridge reference-index get
zotero-bridge paper-artifacts get-manifest --input <JSON>
zotero-bridge paper-artifacts read --input <JSON>
zotero-bridge insights get-attention-queue
zotero-bridge literature ingest --input <JSON>
zotero-bridge workflow list
zotero-bridge workflow submit --workflow <id> --input <JSON>
zotero-bridge workflow run <runId>
zotero-bridge file download <fileId> --output <percorso>
```

L'input accetta: JSON inline, percorso di file JSON, sintassi `@file`, `-` (stdin).

### Contratto di output

stdout emette sempre esattamente un oggetto JSON:

```json
{ "ok": true, "data": {...}, "meta": { "cli": "zotero-bridge", "schema": "zotero-bridge.cli.v1" } }
{ "ok": false, "error": {...}, "meta": { "cli": "zotero-bridge", "schema": "zotero-bridge.cli.v1" } }
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
  "protocol": "host-bridge.v1",
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
<summary>Tutte le 30+ funzionalità</summary>

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
| `library.get_item_notes` | Elenca le note |
| `library.get_note_detail` | Leggi il contenuto della nota |
| `library.list_note_payloads` | Elenca i payload delle note |
| `library.get_note_payload` | Ottieni un payload specifico |
| `library.get_item_attachments` | Elenca gli allegati |

### Mutazione

| Funzionalità | Descrizione |
|-------------|-------------|
| `mutation.preview` | Anteprima di un'operazione di scrittura (senza eseguire) |
| `mutation.execute` | Esegui un'operazione di scrittura (richiede approvazione) |

### Sintesi

| Funzionalità | Descrizione |
|-------------|-------------|
| `topics.list` | Elenca tutti gli argomenti |
| `topics.get_context` | Ottieni il contesto dell'argomento |
| `topics.get_report` | Ottieni il rapporto sull'argomento |
| `topics.get_review_input` | Assembla il pacchetto di revisione dell'argomento |
| `schemas.get` | Ottieni le definizioni degli schemi |
| `concepts.query` | Interroga la base di conoscenza dei concetti |
| `citation_graph.query_cluster` | Interroga il cluster di citazioni |
| `citation_graph.get_overview` | Ottieni la panoramica del grafo |
| `citation_graph.get_slice` | Estrai una porzione del sottografo |
| `citation_graph.get_metrics` | Calcola le metriche del grafo |
| `citation_graph.rank_external_references` | Classifica i riferimenti esterni |
| `citation_graph.rank_library_papers` | Classifica gli articoli della libreria |
| `paper_artifacts.get_manifest` | Ottieni il manifesto degli artifact |
| `paper_artifacts.read` | Leggi il contenuto degli artifact |
| `paper_artifacts.export_filtered` | Esporta gli artifact filtrati |
| `paper_artifacts.resolve_topic_digest` | Risolvi il riassunto dell'argomento |
| `insights.get_attention_queue` | Ottieni la coda di attenzione |
| `resolvers.resolve` | Risolvi i risolvitori di riferimenti/argomenti |
| `reference_index.get` | Ottieni l'indice dei riferimenti |
| `library_index.get` | Ottieni l'indice della libreria |

### Diagnostica

| Funzionalità | Descrizione |
|-------------|-------------|
| `diagnostic.get_status` | Ottieni lo stato del servizio |

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

- [Server MCP](#doc/backends%2Fmcp-server) — Interfaccia protocollo standardizzata per client compatibili con MCP (Claude Desktop, ecc.)
- [Preferenze](#doc/preferences) — Visualizza tutte le impostazioni di Host Bridge
- [Backend ACP](#doc/backends%2Facp) — Scopri la configurazione degli Agent ACP
